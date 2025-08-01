"""
搜索智能体的 API 路由定义
包含所有 API 端点和流式处理逻辑
"""

import time
import logging
import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import message_to_dict

from .models import InputData
from .workflow import create_workflow
from .config import get_config
from .constants import ERROR_QUERY_EMPTY, ERROR_MESSAGES_NOT_LIST, MAX_SEARCH_LOOP

# 创建路由器
router = APIRouter()

# 初始化工作流
config = get_config()
app = create_workflow()


@router.get("/{query}", tags=["search"])
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
    return {"result": query}


@router.get("/query/{query}", tags=["search"])
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
            heartbeat_interval = config.heartbeat_interval
            
            async for chunk in app.astream(
                {
                    "query": query,
                    "messages": messages,
                    "max_search_loop": max_search_loop,
                    "search_loop": search_loop
                }, 
                stream_mode=["messages", "custom"]
            ):
                logging.info(f"Chunk: {chunk}")
                mode, *_ = chunk
                
                # 发送心跳 (防止代理超时断开)
                if time.time() - last_sent > heartbeat_interval:
                    yield ":keep-alive\n\n"
                    last_sent = time.time()
                
                if mode == "updates":
                    mode, data = chunk
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
                    mode, message_chunk = chunk
                    llm_token, metadata = message_chunk
                    # 结构化响应数据
                    response = {
                        "mode": mode,
                        "node": metadata.get('langgraph_node', ""),
                        "data": message_to_dict(llm_token),
                    }
                    yield f"event: messages\ndata: {json.dumps(response)}\n\n"
                    last_sent = time.time()
                
                # 自定义消息用来显示当前正在运行的节点
                elif mode == "custom":
                    mode, data = chunk
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