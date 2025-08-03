"""
搜索智能体路由
重构后的模块化版本，引用 search_agent 模块中的组件
"""

from .search_agent.api import router as search_router
from .chat_agent.api import router as chat_router

__all__ = ["search_router","chat_router"]
