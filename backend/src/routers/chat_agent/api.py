from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import message_to_dict
import logging
from typing import AsyncGenerator
import json
import time
from .workflow import app
from pydantic import BaseModel

class InputData(BaseModel):
    messages: list[dict]

# 创建路由器
router = APIRouter()

@router.post("/stream", tags=["chat"])
async def run_workflow_stream(input_data:InputData):
    """
    运行流式工作流
    
    Args:
        request: 输入数据
            
    Returns:
        StreamingResponse: SSE流式响应对象
        
    Raises:
        HTTPException: 当查询字符串为空时抛出400错误
        HTTPException: 当messages字段不是列表时抛出400错误
    """
    logging.info(f"开始请求，数据体: {input_data}")
    messages = input_data.messages
    
    async def stream_updates() -> AsyncGenerator[str, None]:
        try:
            logging.info(f"开始流式传输:")
            # 添加心跳机制 (每30秒发送空注释)
            last_sent = time.time()
            heartbeat_interval = 30
            
            async for chunk in app.astream(
                {
                    "messages": messages,
                }, 
                stream_mode=["messages","updates", "custom"]
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
            logging.error(f"流式传输错误, 错误: {str(e)}", exc_info=True)
            # 发送错误信息而不是直接断开
            error_msg = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {error_msg}\n\n"
            logging.error(f"Streaming error: {str(e)}")
        
        finally:
            logging.info(f"流式传输结束:")
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