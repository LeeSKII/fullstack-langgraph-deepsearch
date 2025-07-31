"""
搜索智能体的节点函数定义
包含工作流中的所有节点处理函数
"""

import time
import logging
from functools import wraps
from typing import Callable, Any, Dict, List
from langgraph.types import Command
from typing_extensions import Literal
from fastapi import HTTPException
from langchain.output_parsers import PydanticOutputParser

from .models import (
    OverallState, 
    WebSearchJudgement, 
    WebSearchQuery, 
    EvaluateWebSearchResult, 
    ClarifyUser, 
    AnalyzeRouter
)
from ...utils.helpers import send_node_execution_update, send_stream_message_update, send_messages_update
from ...utils.prompts import clarify_with_user_instructions
from ...utils.constants import (
    ANALYZE_NEED_WEB_SEARCH_PROMPT, 
    GENERATE_SEARCH_QUERY_PROMPT, 
    EVALUATE_SEARCH_RESULTS_PROMPT
)


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


def send_node_updates(node_name: str, running_message: str, done_message: str, data=None):
    """发送节点更新信息的辅助函数"""
    send_node_execution_update(node_name, running_message, 'running')
    send_stream_message_update(node_name, running_message, 'running')
    
    if data:
        send_node_execution_update(node_name, done_message, 'done', data)
    else:
        send_node_execution_update(node_name, done_message, 'done')
    
    send_stream_message_update(node_name, done_message, 'done')


def agent_router(state: OverallState, llm, system_prompt: str) -> Command[Literal['clarify_with_user', 'assistant']]:
    """判断是否需要深度研究的智能路由"""
    send_node_updates('agent_router', "agent_router is running", "agent_router is done")
    
    query = state.get("query", "")
    messages = state.get("messages", [])
    parser = PydanticOutputParser(pydantic_object=AnalyzeRouter)
    format_instructions = parser.get_format_instructions()
    
    router_system_prompt = f"你是一个智能分析路由，判断用户的提问是否需要深入思考，还是可以直接回答,你给出的回答必须使用json格式，满足以下格式要求：{format_instructions}"
    structured_output_model = llm.with_structured_output(schema=AnalyzeRouter).with_retry(stop_after_attempt=3)
    
    response = structured_output_model.invoke([
        {'role': 'system', 'content': router_system_prompt},
        *state['messages'],
        {"role": "user", "content": state['query']}
    ])
    
    messages.append({"role": "user", "content": query})
    send_node_execution_update('agent_router', "agent_router is done", 'done', response.model_dump())
    
    if response.need_deep_research:
        return Command(goto="clarify_with_user", update={"messages": messages})
    else:
        return Command(goto="assistant", update={"messages": messages, "isNeedWebSearch": False})


@error_handler("clarify_with_user")
def clarify_with_user(state: OverallState, llm: Any) -> Command[Literal['analyze_need_web_search', '__end__']]:
    """与用户进行交流，澄清用户的需求"""
    send_node_updates('clarify_with_user', "clarify_with_user is running", "clarify_with_user is done")
    
    model = llm.with_structured_output(ClarifyUser).with_retry(stop_after_attempt=3)
    state['messages'].extend([{'role': 'user', 'content': state['query']}])
    messages = state['messages']
    
    response = model.invoke([{
        "role": "user",
        "content": clarify_with_user_instructions.format(
            messages=str(messages), 
            date=time.strftime("%Y-%m-%d", time.localtime())
        )
    }])
    
    send_node_execution_update(
        'clarify_with_user', 
        "clarify_with_user is done", 
        'done', 
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
    send_node_updates('analyze_need_web_search', "analyze_need_web_search is running", "analyze_need_web_search is running")
    
    parser = PydanticOutputParser(pydantic_object=WebSearchJudgement)
    format_instructions = parser.get_format_instructions()
    query = state['query']
    prompt = ANALYZE_NEED_WEB_SEARCH_PROMPT.format(query=query, format_instructions=format_instructions)
    
    response = llm.invoke([
        {'role': 'system', 'content': system_prompt},
        *state['messages'],
        {"role": "user", "content": prompt}
    ])
    
    model = parser.parse(response.content)
    logging.info(f"Parsed analyze_need_web_search model: {model}")
    
    send_node_updates(
        'analyze_need_web_search',
        "analyze_need_web_search is running",
        "analyze_need_web_search is done",
        {
            "query": state['query'],
            "messages": state['messages'],
            "isNeedWebSearch": model.isNeedWebSearch,
            "reason": model.reason,
            "confidence": model.confidence
        }
    )
    
    return {
        "query": state['query'],
        "messages": state['messages'],
        "isNeedWebSearch": model.isNeedWebSearch,
        "reason": model.reason,
        "confidence": model.confidence
    }


@error_handler("generate_search_query")
def generate_search_query(state: OverallState, llm: Any, system_prompt: str) -> OverallState:
    """生成搜索查询"""
    send_node_updates('generate_search_query', "generate_search_query is running", "generate_search_query is done")
    
    query = state['query']
    messages = state.get("messages", [])
    parser = PydanticOutputParser(pydantic_object=WebSearchQuery)
    format_instructions = parser.get_format_instructions()
    prompt = GENERATE_SEARCH_QUERY_PROMPT.format(query=query, format_instructions=format_instructions)
    
    response = llm.invoke([
        {'role': 'system', 'content': system_prompt},
        *messages,
        {"role": "user", "content": prompt}
    ])
    
    model = parser.parse(response.content)
    logging.info(f"Parsed generate_search_query model: {model}")
    
    send_node_updates(
        'generate_search_query',
        "generate_search_query is running",
        "generate_search_query is done",
        {
            "web_search_query": model.query,
            "web_search_depth": model.search_depth,
            "reason": model.reason,
            "confidence": model.confidence
        }
    )
    
    return {
        "web_search_query": model.query,
        "web_search_depth": model.search_depth,
        "reason": model.reason,
        "confidence": model.confidence
    }


@error_handler("web_search")
def web_search(state: OverallState, tavily_client: Any) -> OverallState:
    """网页搜索"""
    send_node_execution_update('web_search', "web_search is running", 'running')
    
    query = state['web_search_query']
    search_depth = state['web_search_depth']
    messages = state.get("messages", [])
    
    search_result = tavily_client.search(query, search_depth=search_depth)
    logging.info(f"搜索查询: {query}, 搜索深度: {search_depth}")
    
    search_loop = state['search_loop'] + 1
    
    send_node_execution_update('web_search', "web_search is done", 'done', {"web_search_results": search_result['results']})
    
    return {
        "web_search_results": search_result['results'],
        "messages": messages,
        "search_loop": search_loop,
        "web_search_query_list": [query]
    }


@error_handler("evaluate_search_results")
def evaluate_search_results(state: OverallState, llm: Any, system_prompt: str) -> OverallState:
    """评估搜索结果,是否足够可以回答用户提问"""
    send_node_updates('evaluate_search_results', "evaluate_search_results is running', 'evaluate_search_results is done")
    
    current_search_results = state['web_search_results']
    query = state['query']
    web_search_query = state['web_search_query']
    parser = PydanticOutputParser(pydantic_object=EvaluateWebSearchResult)
    format_instructions = parser.get_format_instructions()
    
    prompt = EVALUATE_SEARCH_RESULTS_PROMPT.format(
        query=query,
        web_search_query=web_search_query,
        web_search_query_list=state['web_search_query_list'],
        current_search_results=current_search_results,
        format_instructions=format_instructions
    )
    
    response = llm.invoke([
        {'role': 'system', 'content': system_prompt},
        {"role": "user", "content": prompt}
    ])
    
    model = parser.parse(response.content)
    logging.info(f"Parsed evaluate_search_results model: {model}")
    
    send_node_updates(
        'evaluate_search_results',
        "evaluate_search_results is running",
        "evaluate_search_results is done",
        {
            "is_sufficient": model.is_sufficient,
            "followup_search_query": model.followup_search_query,
            "search_depth": model.search_depth,
            "reason": model.reason,
            "confidence": model.confidence
        }
    )
    
    return {
        "is_sufficient": model.is_sufficient,
        "web_search_query": model.followup_search_query,
        "followup_search_query": model.followup_search_query,
        "search_depth": model.search_depth,
        "reason": model.reason,
        "confidence": model.confidence
    }


@error_handler("assistant_node")
def assistant_node(state: OverallState, llm: Any, system_prompt: str, reply_system_prompt: str) -> OverallState:
    """助手响应"""
    send_node_updates('assistant_node', "assistant_node is running", "assistant_node is done")
    
    query = state['query']
    
    if state['isNeedWebSearch']:
        send_messages = [
            {'role': 'system', 'content': reply_system_prompt},
            *state['messages'],
            {
                "role": "user",
                "content": f"用户提问：{state['query']}，然后系统根据该提问生成了不同角度的搜索关键字：{state['web_search_query_list']}，得到的搜索结果：{state['web_search_results']}，请根据以上信息，满足用户的需求。"
            }
        ]
    else:
        send_messages = [
            {'role': 'system', 'content': system_prompt},
            *state['messages'],
            {"role": "user", "content": f"{state['query']}"}
        ]
    
    ai_response = llm.invoke(send_messages)
    logging.info(f"助手响应生成成功: {query}")
    
    messages = [
        *state["messages"],
        {"role": "user", "content": f"{state['query']}"},
        {"role": "assistant", "content": ai_response.content}
    ]
    
    send_node_updates(
        'assistant_node',
        "assistant_node is running",
        "assistant_node is done",
        {"response": "Response generated successfully"}
    )
    
    send_messages_update('assistant_node', messages)
    
    return {
        "response": ai_response.content,
        "messages": messages
    }


def need_web_search(state: OverallState) -> bool:
    """判断是否需要网页搜索"""
    return state['isNeedWebSearch']


def need_next_search(state: OverallState) -> str:
    """判断是否需要进行下一次搜索"""
    if state["is_sufficient"] or state["search_loop"] >= state["max_search_loop"]:
        return "assistant"
    else:
        return "web_search"