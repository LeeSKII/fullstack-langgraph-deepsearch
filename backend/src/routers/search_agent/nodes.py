"""
搜索智能体的节点函数定义
包含工作流中的所有节点处理函数
"""

from ast import Str
import time
import logging
from functools import wraps
from typing import Callable, Any, Dict, List, Optional
from langgraph.types import Command,Send
from typing_extensions import Literal
from fastapi import HTTPException
from langchain.output_parsers import PydanticOutputParser
from enum import Enum
import uuid

from sqlalchemy import over

from .models import (
    OverallState, 
    WebSearchJudgement, 
    EvaluateWebSearchResult, 
    ClarifyUser, 
    AnalyzeRouter,
    SearchQueryList,
    WebSearchState,
    WebSearchDoc
)
from ...utils.helpers import send_node_execution_update, send_stream_message_update, send_messages_update
from .prompts import clarify_with_user_instructions,answer_instructions,analyze_need_web_search_instructions,query_writer_instructions,reflection_instructions
from .config import get_config

config = get_config()

class NodeStatus(str, Enum):
    """节点状态枚举"""
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


def error_handler(node_name: str):
    """错误处理装饰器"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                query = kwargs.get('state', {}).get('query', 'Unknown')
                logging.error(f"{node_name} 节点执行失败: {query}, 错误: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"{node_name} 节点执行失败: {str(e)}")
        return wrapper
    return decorator


def send_node_update(node_name: str, status: NodeStatus, data: Optional[Dict] = None):
    """发送节点更新信息的统一函数"""
    message = f"{node_name} is {status.value}"
    
    send_node_execution_update(node_name, message, status.value, data)
    send_stream_message_update(node_name, message, status.value)


def agent_router(state: OverallState, llm, system_prompt: str) -> Command[Literal['clarify_with_user', 'assistant']]:
    """判断是否需要深度研究的智能路由"""
    send_node_update('agent_router', NodeStatus.RUNNING)
    
    query = state.get("query", "")
    messages = state.get("messages", [])
    parser = PydanticOutputParser(pydantic_object=AnalyzeRouter)
    format_instructions = parser.get_format_instructions()
    
    router_system_prompt = f"你是一个智能分析路由，判断用户的提问是否需要进行深度研究，还是可以直接回答,你给出的回答必须使用json格式，满足以下格式要求：{format_instructions}"
    structured_output_model = llm.with_structured_output(schema=AnalyzeRouter).with_retry(stop_after_attempt=3)
    
    response = structured_output_model.invoke([
        {'role': 'system', 'content': router_system_prompt},
        *state['messages'],
        {"role": "user", "content": state['query']}
    ])
    
    messages.append({"role": "user", "content": query})
    send_node_update('agent_router', NodeStatus.DONE, response.model_dump())
    
    if response.need_deep_research:
        return Command(goto="clarify_with_user", update={"messages": messages})
    else:
        return Command(goto="assistant", update={"messages": messages, "isNeedWebSearch": False})


@error_handler("clarify_with_user")
def clarify_with_user(state: OverallState, llm: Any) -> Command[Literal['analyze_need_web_search', '__end__']]:
    """与用户进行交流，澄清用户的需求"""
    send_node_update('clarify_with_user', NodeStatus.RUNNING)
    
    model = llm.with_structured_output(ClarifyUser).with_retry(stop_after_attempt=3)
    messages = state['messages']
    
    response = model.invoke([{
        "role": "user",
        "content": clarify_with_user_instructions.format(
            messages=str(messages),
        )
    }])
    
    send_node_update(
        'clarify_with_user',
        NodeStatus.DONE,
        {
            "need_clarification": response.need_clarification,
            "question": response.question,
            "verification": response.verification
        }
    )
    
    if response.need_clarification:
        messages.extend([{'role': 'assistant', 'content': response.question}])
        send_messages_update('clarify_with_user', messages)
        return Command(goto="__end__", update={"messages": messages, "query": state['query']})
    else:
        messages.extend([{'role': 'assistant', 'content': response.verification}])
        return Command(goto="analyze_need_web_search", update={"messages": messages, "query": response.verification})


@error_handler("analyze_need_web_search")
def analyze_need_web_search(state: OverallState, llm: Any, system_prompt: str) -> OverallState:
    """判断是否需要进行网页搜索"""
    send_node_update('analyze_need_web_search', NodeStatus.RUNNING)
    
    parser = PydanticOutputParser(pydantic_object=WebSearchJudgement)
    format_instructions = parser.get_format_instructions()
    query = state['query']
    prompt = analyze_need_web_search_instructions.format(query=query, format_instructions=format_instructions)
    
    response = llm.invoke([
        {'role': 'system', 'content': system_prompt},
        *state['messages'],
        {"role": "user", "content": prompt}
    ])
    
    model = parser.parse(response.content)
    logging.info(f"Parsed analyze_need_web_search model: {model}")
    
    send_node_update(
        'analyze_need_web_search',
        NodeStatus.DONE,
        {
            "isNeedWebSearch": model.isNeedWebSearch,
            "reason": model.reason,
            "confidence": model.confidence
        }
    )
    
    return {
        "isNeedWebSearch": model.isNeedWebSearch,
        "is_sufficient":False,
        "reason": model.reason,
        "confidence": model.confidence
    }


@error_handler("generate_search_query")
def generate_search_query(state: OverallState, llm: Any, system_prompt: str) -> OverallState:
    """生成搜索查询"""
    send_node_update('generate_search_query', NodeStatus.RUNNING)
    
    query = state['query']
    messages = state.get("messages", [])
    generated_queries_number = state.get("generated_queries_number", config.default_number_queries)
    parser = PydanticOutputParser(pydantic_object=SearchQueryList)
    format_instructions = parser.get_format_instructions()
    prompt = query_writer_instructions.format(query=query, format_instructions=format_instructions,number_queries=generated_queries_number)
    llm_with_structured =  llm.with_structured_output(SearchQueryList).with_retry(stop_after_attempt=3)
    response:SearchQueryList = llm_with_structured.invoke([
        {'role': 'system', 'content': system_prompt},
        *messages,
        {"role": "user", "content": prompt}
    ])
    
    logging.info(f"Parsed generate_search_query model: {response}")
    
    send_node_update(
        'generate_search_query',
        NodeStatus.DONE,
        {
            "query": '|'.join(response.query)
        }
    )

    return {
        'web_search_query_wait_list': response.query,
    }

@error_handler("web_search")
def web_search(state: WebSearchState, tavily_client: Any) -> OverallState:
    """网页搜索"""
    random_uuid = uuid.uuid4()
    random_uuid_str = str(random_uuid)
    send_node_update('web_search', NodeStatus.RUNNING, {"id": random_uuid_str})
    
    query = state['search_query']
    
    response = tavily_client.search(query, search_depth='basic')
    search_result = response['results']
    # sources_gathered = [WebSearchDoc(title=item['title'], url=item['url'], content=item['content']) for item in search_result]
    sources_gathered = [{"title": item['title'], "url": item['url'], "content": item['content']} for item in search_result]
    
    send_node_update('web_search', NodeStatus.DONE, {"id": random_uuid_str,"web_search_results": sources_gathered})
    
    return {
        "web_search_results_list": sources_gathered,
        "web_search_queries_list": [query]
    }


@error_handler("evaluate_search_results")
def evaluate_search_results(state: OverallState, llm: Any, system_prompt: str) -> OverallState:
    """评估搜索结果,是否足够可以回答用户提问"""
    send_node_update('evaluate_search_results', NodeStatus.RUNNING)
    
    current_search_results = state['web_search_results_list']
    query = state['query']
    messages = state.get("messages", [])

    parser = PydanticOutputParser(pydantic_object=EvaluateWebSearchResult)
    format_instructions = parser.get_format_instructions()
    
    prompt = reflection_instructions.format(
        research_topic=query,
        format_instructions=format_instructions,
        summaries=current_search_results
    )
    llm_with_structured =  llm.with_structured_output(EvaluateWebSearchResult).with_retry(stop_after_attempt=3)
    response:EvaluateWebSearchResult = llm_with_structured.invoke([
        {'role': 'system', 'content': system_prompt},
        *messages,
        {"role": "user", "content": prompt}
    ])

    logging.info(f"Parsed evaluate_search_results model: {response}")
    
    send_node_update(
        'evaluate_search_results',
        NodeStatus.DONE,
        {
            "is_sufficient": response.is_sufficient,
            "followup_search_query": "|".join(response.follow_up_queries),
            "knowledge_gap": response.knowledge_gap,
            "web_search_query_wait_list": "|".join(response.follow_up_queries),
        }
    )
    
    return {
        "is_sufficient": response.is_sufficient,
        "followup_search_query": response.follow_up_queries,
        "knowledge_gap": response.knowledge_gap,
        "web_search_query_wait_list": response.follow_up_queries,
    }


@error_handler("assistant_node")
def assistant_node(state: OverallState, llm: Any, system_prompt: str) -> OverallState:
    """助手响应"""
    send_node_update('assistant_node', NodeStatus.RUNNING)
    
    query = state['query']
    
    if state['isNeedWebSearch']:
        summaries = state['web_search_results_list']
        send_messages = [
            {'role': 'system', 'content': system_prompt},
            *state['messages'],
            {
                "role": "user",
                "content": answer_instructions.format(research_topic=query,summaries=summaries)
            }
        ]
    else:
        send_messages = [
            {'role': 'system', 'content': system_prompt},
            *state['messages']
        ]
    
    ai_response = llm.invoke(send_messages)
    logging.info(f"助手响应生成成功: {query}")
    
    messages = [
        *state["messages"],
        {"role": "user", "content": f"{state['query']}"},
        {"role": "assistant", "content": ai_response.content}
    ]
    
    send_node_update(
        'assistant_node',
        NodeStatus.DONE,
        {"response": "Response generated successfully"}
    )
    
    send_messages_update('assistant_node', messages)
    
    return {
        "response": ai_response.content,
        "messages": messages
    }

def need_web_search(state: OverallState) -> str:
    """判断是否需要进行下一次搜索"""
    query_count = len(state['web_search_queries_list'])
    if state["is_sufficient"] or query_count >= state["max_search_loop"]:
        return "assistant"
    elif state['web_search_query_wait_list'] == []:
        return "assistant"
    else:
        return [
            Send("web_search", {"search_query": search_query, "id": int(idx)})
            for idx, search_query in enumerate(state['web_search_query_wait_list'])
        ]