"""
应用程序主模块

该模块是应用程序的入口点，负责创建 FastAPI 应用实例并注册路由。
"""

from fastapi import FastAPI

from .routers import search
from .utils import logger
import logging

app = FastAPI()

app.include_router(search.router,prefix="/llm/deep/search")

@app.get("/")
def read_root():
    """
    根路径接口，返回欢迎信息
    
    Returns:
        dict: 包含欢迎信息的字典
    """
    logging.info("Root endpoint accessed")
    return {"Hello": "Deep Searcher"}

