"""
应用程序主模块

该模块是应用程序的入口点，负责创建 FastAPI 应用实例并注册路由。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import search
from .utils import logger
import logging

app = FastAPI()

origins = ["*"]

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 允许访问的源
    allow_credentials=True, # 支持 cookie
    allow_methods=["*"],    # 允许使用的请求方法
    allow_headers=["*"],    # 允许携带的 Headers
 )

app.include_router(search.search_router,prefix="/llm/deep/search")
app.include_router(search.chat_router,prefix="/llm/chat")

@app.get("/")
def read_root():
    """
    根路径接口，返回欢迎信息
    
    Returns:
        dict: 包含欢迎信息的字典
    """
    logging.info("Root endpoint accessed")
    return {"Hello": "Deep Searcher"}

