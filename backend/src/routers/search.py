import time
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
from typing_extensions import TypedDict
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage,AnyMessage,messages_to_dict,messages_from_dict,message_to_dict
from langchain_core.prompts import PromptTemplate
from langgraph.config import get_stream_writer
from langchain.output_parsers import PydanticOutputParser
from operator import add
from pydantic import BaseModel, Field
from enum import Enum
import os
import logging
from typing import AsyncGenerator, NotRequired,Annotated,Literal
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
from tavily import TavilyClient
from dotenv import load_dotenv
from ..utils.prompts import clarify_with_user_instructions
from ..utils.constants import DEFAULT_SEARCH_MODEL_NAME, MAX_SEARCH_LOOP, SIMPLE_SYSTEM_PROMPT, DETAILED_SYSTEM_PROMPT, QWEN_API_KEY, QWEN_API_BASE_URL, SEARCH_MODEL_NAME, TAVILY_API_KEY, ERROR_QWEN_API_KEY_MISSING, ERROR_QWEN_API_BASE_URL_MISSING, ERROR_TAVILY_API_KEY_MISSING, ERROR_QUERY_EMPTY,ERROR_MESSAGES_NOT_LIST, ANALYZE_NEED_WEB_SEARCH_PROMPT, GENERATE_SEARCH_QUERY_PROMPT, EVALUATE_SEARCH_RESULTS_PROMPT
from ..utils.helpers import send_node_execution_update, send_stream_message_update, send_messages_update

# 环境变量加载
load_dotenv()

router = APIRouter()

# 环境变量配置
api_key = os.getenv(QWEN_API_KEY)
if not api_key:
    raise ValueError(ERROR_QWEN_API_KEY_MISSING)

base_url = os.getenv(QWEN_API_BASE_URL)
if not base_url:
    raise ValueError(ERROR_QWEN_API_BASE_URL_MISSING)

model_name = os.getenv(SEARCH_MODEL_NAME, DEFAULT_SEARCH_MODEL_NAME)

# Initialize Tavily client
tavily_api_key = os.getenv(TAVILY_API_KEY)
if not tavily_api_key:
    raise ValueError(ERROR_TAVILY_API_KEY_MISSING)
    
tavily_client = TavilyClient(api_key=tavily_api_key)

llm = ChatOpenAI(model=model_name, api_key=api_key, base_url=base_url, temperature=0.7)

# 简单的系统提示，用于普通对话
system_prompt = SIMPLE_SYSTEM_PROMPT.format(current_time=time.strftime("%Y-%m-%d", time.localtime()))

# 详细的系统提示，用于生成研究报告
reply_system_prompt = DETAILED_SYSTEM_PROMPT.format(current_time=time.strftime("%Y-%m-%d", time.localtime()))

# 判断是否需要网页搜索
class WebSearchJudgement(BaseModel):
    """判断是否需要网页搜索的模型"""
    isNeedWebSearch: bool = Field(description="是否需要通过网页搜索获取足够的信息进行回复")
    reason: str = Field(description="选择执行该动作的原因")
    confidence: float = Field(description="置信度，评估是否需要网页搜索的可靠性")

class SearchDepthEnum(str, Enum):
    """搜索深度枚举"""
    BASIC = "basic"
    ADVANCED = "advanced"

class WebSearchQuery(BaseModel):
    """网页搜索查询模型"""
    query: str = Field(description="预备进行网络搜索查询的问题")
    search_depth: SearchDepthEnum = Field(description="搜索的深度，枚举值：BASIC、ADVANCED")
    reason: str = Field(description="生成该搜索问题的原因")
    confidence: float = Field(description="关联度，评估生成的搜索问题和用户提问的关联度")
    
class EvaluateWebSearchResult(BaseModel):
    """评估搜索结果的模型"""
    is_sufficient: bool = Field(description="是否搜索到了足够的信息帮助用户回答")
    followup_search_query: str = Field(default="", description="如果搜索结果不足以回答用户提问，进行进一步的搜索的问题")
    search_depth: SearchDepthEnum = Field(default=SearchDepthEnum.BASIC, description="进行进一步的搜索的问题,搜索的深度，枚举值：BASIC、ADVANCED")
    reason: str = Field(default="", description="生成该搜索问题的原因")
    confidence: float = Field(description="置信度")

# 定义状态类
class OverallState(TypedDict):
    """工作流状态类，用于在各个节点之间传递状态"""
    query: str  # 用户查询
    web_search_query: str  # 网络搜索查询
    web_search_depth: str  # 搜索深度
    web_search_results: Annotated[list[str], add]  # 搜索结果列表
    web_search_query_list: Annotated[list[str], add]  # 搜索查询历史列表
    max_search_loop: int  # 最大搜索循环次数
    search_loop: int  # 当前搜索循环次数
    response: str  # 响应内容
    messages: list[dict]  # 消息历史
    isNeedWebSearch: bool  # 是否需要网络搜索
    reason: str  # 判断原因
    confidence: float  # 置信度
    is_sufficient: bool  # 搜索结果是否足够
    followup_search_query: str  # 后续搜索查询

class ClarifyUser(BaseModel):
    """澄清用户需求模型"""
    need_clarification: bool = Field(
        description="Whether the user needs to be asked a clarifying question.",
    )
    question: str = Field(
        description="A question to ask the user to clarify the report scope",
    )
    verification: str = Field(
        description="Verify message that we will start research after the user has provided the necessary information.",
    )
    
def clarify_with_user(state: OverallState)-> Command[Literal['analyze_need_web_search','__end__']]:
    """与用户进行交流，澄清用户的需求"""
    # 自定义输出信息
    send_node_execution_update('clarify_with_user', "clarify_with_user is running", 'running')
    send_stream_message_update('clarify_with_user', "clarify_with_user is done", 'running')
    model = llm.with_structured_output(ClarifyUser).with_retry(stop_after_attempt=3)
    # state的就地更新模式
    state['messages'].extend([{'role':'user','content':state['query']}])
    messages = state['messages']
    response = model.invoke([{"role":"user","content":clarify_with_user_instructions.format(messages=str(messages), date=time.strftime("%Y-%m-%d", time.localtime()))}])
    
    # 自定义输出信息
    send_stream_message_update('clarify_with_user', "clarify_with_user is done", 'done')
    send_node_execution_update('clarify_with_user', "clarify_with_user is done", 'done', {"need_clarification":response.need_clarification,"question":response.question,"verification":response.verification})
    
    if response.need_clarification:
        messages.extend([{'role':'assistant','content':response.question}])
        #TODO: 发送更新UI消息的信息，这里其实只需要发送assistant的消息即可
        send_messages_update('clarify_with_user', messages)
        return Command(goto=END, update={"messages": messages,"query":state['query']})
    else:
        messages.extend([{'role':'assistant','content':response.verification}])
        send_messages_update('clarify_with_user', messages)
        return Command(goto="analyze_need_web_search", update={"messages": messages,"query":response.verification})


def analyze_need_web_search(state: OverallState)-> OverallState:
    """判断是否需要进行网页搜索"""

    # 自定义输出信息
    send_node_execution_update('analyze_need_web_search', "analyze_need_web_search is running", 'running')
    send_stream_message_update('analyze_need_web_search', "analyze_need_web_search is running", 'running')

    parser = PydanticOutputParser(pydantic_object=WebSearchJudgement)
    # 获取 JSON Schema 的格式化指令
    format_instructions = parser.get_format_instructions()
    query=state['query']
    prompt = ANALYZE_NEED_WEB_SEARCH_PROMPT.format(query=query, format_instructions=format_instructions)
    
    try:
        response = llm.invoke([{'role':'system','content':system_prompt},*state['messages'],{"role":"user","content":prompt}])
        model = parser.parse(response.content)
        logging.info(f"Parsed analyze_need_web_search model: {model}")        
    except Exception as e:
        logging.error(f"分析是否需要网络搜索失败: {query}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"分析是否需要网络搜索失败: {str(e)}")
    
    # 自定义输出信息
    send_stream_message_update('analyze_need_web_search', "analyze_need_web_search is done", 'done')
    send_node_execution_update('analyze_need_web_search', "analyze_need_web_search is done", 'done', {"query":state['query'],"messages":state['messages'],"isNeedWebSearch":model.isNeedWebSearch,"reason":model.reason,"confidence":model.confidence})

    return {"query":state['query'],"messages":state['messages'],"isNeedWebSearch":model.isNeedWebSearch,"reason":model.reason,"confidence":model.confidence}

def generate_search_query(state: OverallState)-> OverallState:
    """生成搜索查询"""

    # 自定义输出信息
    send_node_execution_update('generate_search_query', "generate_search_query is running", 'running')
    send_stream_message_update('generate_search_query', "generate_search_query is running", 'running')

    query = state['query']
    messages = state.get("messages", [])
    parser = PydanticOutputParser(pydantic_object=WebSearchQuery)
    # 获取 JSON Schema 的格式化指令
    format_instructions = parser.get_format_instructions()
    prompt = GENERATE_SEARCH_QUERY_PROMPT.format(query=query, format_instructions=format_instructions)
    
    try:
        response = llm.invoke([{'role':'system','content':system_prompt},*messages,{"role":"user","content":prompt}])
        model = parser.parse(response.content)
        logging.info(f"Parsed generate_search_query model: {model}")   
    except Exception as e:
        logging.error(f"生成搜索查询失败: {query}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"生成搜索查询失败: {str(e)}")
    
    # 自定义输出信息
    send_stream_message_update('generate_search_query', "generate_search_query is done", 'done')
    send_node_execution_update('generate_search_query', "generate_search_query is running", 'done', {"web_search_query":model.query,"web_search_depth":model.search_depth,"reason":model.reason,"confidence":model.confidence})

    return {"web_search_query":model.query,"web_search_depth":model.search_depth,"reason":model.reason,"confidence":model.confidence}

def web_search(state: OverallState)-> OverallState:

    # 自定义输出信息
    send_node_execution_update('web_search', "web_search is running", 'running')

    """网页搜索"""
    query = state['web_search_query']
    search_depth = state['web_search_depth']
    messages = state.get("messages", [])
    
    try:
        search_result = tavily_client.search(query, search_depth=search_depth)
        logging.info(f"搜索查询: {query}, 搜索深度: {search_depth}")
    except Exception as e:
        logging.error(f"搜索失败: {query}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")
    
    search_loop = state['search_loop']+1

    # 自定义输出信息
    send_node_execution_update('web_search', "web_search is done", 'done', {"web_search_results":search_result['results']})

    # 如果这里包含了langchain提供的message类型，那么会直接触发message的流式更新动作
    return {"web_search_results":search_result['results'],"messages":messages,"search_loop":search_loop,"web_search_query_list":[query]}

def evaluate_search_results(state: OverallState)-> OverallState:
    """评估搜索结果,是否足够可以回答用户提问"""

    # 自定义输出信息
    send_node_execution_update('evaluate_search_results', "evaluate_search_results is running", 'running')
    send_stream_message_update('evaluate_search_results', "evaluate_search_results is running", 'running')

    current_search_results = state['web_search_results']
    query = state['query']
    web_search_query = state['web_search_query']
    parser = PydanticOutputParser(pydantic_object=EvaluateWebSearchResult)
    # 获取 JSON Schema 的格式化指令
    format_instructions = parser.get_format_instructions()
    prompt = EVALUATE_SEARCH_RESULTS_PROMPT.format(
        query=query,
        web_search_query=web_search_query,
        web_search_query_list=state['web_search_query_list'],
        current_search_results=current_search_results,
        format_instructions=format_instructions
    )
    
    try:
        response = llm.invoke([{'role':'system','content':system_prompt},{"role":"user","content":prompt}])
        model = parser.parse(response.content)
        logging.info(f"Parsed evaluate_search_results model: {model}") 
    except Exception as e:
        logging.error(f"评估搜索结果失败: {query}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"评估搜索结果失败: {str(e)}")
    
    # 自定义输出信息
    send_stream_message_update('evaluate_search_results', "evaluate_search_results is done", 'done')
    send_node_execution_update('evaluate_search_results', "evaluate_search_results is running", 'done', {"is_sufficient":model.is_sufficient,"followup_search_query":model.followup_search_query,"search_depth":model.search_depth,"reason":model.reason,"confidence":model.confidence})

    return {"is_sufficient":model.is_sufficient,"web_search_query":model.followup_search_query,"followup_search_query":model.followup_search_query,"search_depth":model.search_depth,"reason":model.reason,"confidence":model.confidence}

def assistant_node(state: OverallState) -> OverallState:
    """助手响应"""

    # 自定义输出信息
    send_node_execution_update('assistant_node', "assistant_node is running", 'running')
    send_stream_message_update('assistant_node', "assistant_node is running", 'running')

    query = state['query']
    
    if(state['isNeedWebSearch']):
        send_messages = [{'role':'system','content':reply_system_prompt},*state['messages'],{"role":"user","content":f"用户提问：{state['query']}，然后系统根据该提问生成了不同角度的搜索关键字：{state['web_search_query_list']}，得到的搜索结果：{state['web_search_results']}，请根据以上信息，满足用户的需求。"}]
    else:
        send_messages = [{'role':'system','content':system_prompt},*state['messages'],{"role":"user","content":f"{state['query']}"}]

    try:
        ai_response = llm.invoke(send_messages)
        logging.info(f"助手响应生成成功: {query}")
    except Exception as e:
        logging.error(f"助手响应生成失败: {query}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"助手响应生成失败: {str(e)}")
    
    messages = [*state["messages"],{"role":"user","content":f"{state['query']}"},{"role":"assistant","content":ai_response.content}]

    # 自定义输出信息
    send_stream_message_update('assistant_node', "assistant_node is running", 'done')
    # 输出最终的messages信息对
    send_messages_update('assistant_node', messages)
    send_node_execution_update('assistant_node', "assistant_node is running", 'done', {"response":"Response generated successfully"})

    return {"response":ai_response.content,"messages":messages}

def need_web_search(state: OverallState)->bool:
    """判断是否需要网页搜索
    
    Args:
        state (OverallState): 工作流状态
        
    Returns:
        bool: 是否需要网页搜索
    """
    return state['isNeedWebSearch']

def need_next_search(state: OverallState)->str:
    """判断是否需要进行下一次搜索
    
    Args:
        state (OverallState): 工作流状态
        
    Returns:
        str: 下一个节点名称
    """
    if state["is_sufficient"] or state["search_loop"] >= state["max_search_loop"]:
        return "assistant"
    else:
        return "web_search"

# 创建图形
workflow = StateGraph(OverallState)

# 添加节点
workflow.add_node('clarify_with_user',clarify_with_user)
workflow.add_node("analyze_need_web_search", analyze_need_web_search)
workflow.add_node("generate_search_query", generate_search_query)
workflow.add_node("web_search", web_search)
workflow.add_node("evaluate_search_results", evaluate_search_results)
workflow.add_node("assistant", assistant_node)


# 添加普通边
workflow.add_edge(START,"clarify_with_user")

workflow.add_conditional_edges("analyze_need_web_search",need_web_search,{True: "generate_search_query", False: "assistant"})
workflow.add_edge("generate_search_query","web_search")
workflow.add_edge("web_search","evaluate_search_results")
workflow.add_conditional_edges("evaluate_search_results",need_next_search,["web_search","assistant"])
workflow.add_edge("assistant",END)

# 编译图形
app = workflow.compile()

# 测试接口
@router.get("/{query}",tags=["search"])
async def test(query: str):
    """
    测试接口，返回查询字符串
    
    Args:
        query (str): 查询字符串
        
    Returns:
        dict: 包含查询字符串的字典
        
    Raises:
        HTTPException: 当查询字符串为空时抛出400错误
    """
    # 输入验证
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail=ERROR_QUERY_EMPTY)
    return {"result":query}

# LLM value传输
@router.get("/query/{query}",tags=["search"])
async def run_workflow_non_stream(query: str):
    """
    运行非流式工作流
    
    Args:
        query (str): 用户查询字符串
        
    Returns:
        dict: 工作流执行结果
        
    Raises:
        HTTPException: 当查询字符串为空时抛出400错误
        HTTPException: 当工作流执行出错时抛出500错误
    """
    # 输入验证
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail=ERROR_QUERY_EMPTY)
    
    try:
        logging.info(f"开始非流式传输: {query}")
        result = await app.ainvoke({"query": query.strip()})
        logging.info(f"非流式传输完成: {query}")
        return result
    except Exception as e:
        logging.error(f"非流式传输错误: {query}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"非流式传输错误: {str(e)}")

class InputData(TypedDict):
    query: str  # 必填字段
    messages: NotRequired[list[dict]]  # 可选字段

# LLM stream传输
@router.post("/stream", tags=["search"])
async def run_workflow_stream(input_data: InputData):
    """
    运行流式工作流
    
    Args:
        input_data (InputData): 包含查询字符串和消息历史的输入数据
            - query (str): 用户查询字符串（必填）
            - messages (list, optional): 消息历史列表
            
    Returns:
        StreamingResponse: SSE流式响应对象
        
    Raises:
        HTTPException: 当查询字符串为空时抛出400错误
        HTTPException: 当messages字段不是列表时抛出400错误
    """
    query = input_data["query"]  # 必填字段直接访问
    messages = input_data.get("messages", [])
    
    # 输入验证
    if not query or not query.strip():
        # 使用HTTP异常更符合REST规范
        raise HTTPException(status_code=400, detail=ERROR_QUERY_EMPTY)
    
    # 验证messages字段
    if messages and not isinstance(messages, list):
        raise HTTPException(status_code=400, detail=ERROR_MESSAGES_NOT_LIST)
    
    max_search_loop = MAX_SEARCH_LOOP  # 最大搜索次数
    search_loop = 0  # 当前搜索次数
    
    async def stream_updates() -> AsyncGenerator[str, None]:
        try:
            logging.info(f"开始流式传输: {query}")
            # 添加心跳机制 (每30秒发送空注释)
            last_sent = time.time()
            
            async for chunk in app.astream({"query": query,"messages":messages,"max_search_loop":max_search_loop,"search_loop":search_loop}, stream_mode=["updates","messages","custom"]):
                logging.info(f"Chunk: {chunk}")
                mode,*_ = chunk
                
                # 发送心跳 (防止代理超时断开)
                if time.time() - last_sent > 30:
                    yield ":keep-alive\n\n"
                    last_sent = time.time()
                
                if mode == "updates":
                    mode,data = chunk
                    node_name = list(data.keys())[0]
                    # 结构化响应数据
                    response = {
                        "mode": mode,
                        "node": node_name,
                        "data": data[node_name]
                    }
                    yield f"event: updates\ndata: {json.dumps(response)}\n\n"
                    last_sent = time.time()

                elif mode == "messages":
                    mode,message_chunk = chunk
                    llm_token,metadata = message_chunk
                    # 结构化响应数据
                    response = {
                        "mode": mode,
                        "node":metadata.get('langgraph_node',""),
                        "data": message_to_dict(llm_token),
                        # "metadata": metadata
                    }
                    yield f"event: messages\ndata: {json.dumps(response)}\n\n"
                    last_sent = time.time()
                # 自定义消息用来显示当前正在运行的节点
                elif mode == "custom":
                    mode,data = chunk
                    node_name = data['node']
                    # 结构化响应数据
                    response = {
                        "mode": mode,
                        "node": node_name,
                        "data": data
                    }
                    yield f"event: custom\ndata: {json.dumps(response)}\n\n"
                    last_sent = time.time()
                
        except Exception as e:
            logging.error(f"流式传输错误: {query}, 错误: {str(e)}", exc_info=True)
            # 发送错误信息而不是直接断开
            error_msg = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {error_msg}\n\n"
            logging.error(f"Streaming error: {str(e)}")
          
        finally:
            logging.info(f"流式传输结束: {query}")
            # 发送结束事件
            yield "event: end\ndata: {}\n\n"
      
    return StreamingResponse(
        stream_updates(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            # 添加浏览器兼容头部
            "Content-Encoding": "none",
            "X-SSE-Content-Type": "text/event-stream"
        }
    )
