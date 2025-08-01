"""
搜索智能体的配置管理
包含环境变量配置、客户端初始化和系统提示配置
"""

import os
import time
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from tavily import TavilyClient
from typing import Optional

from .constants import (
    QWEN_API_KEY, 
    QWEN_API_BASE_URL, 
    SEARCH_MODEL_NAME, 
    TAVILY_API_KEY, 
    DEFAULT_SEARCH_MODEL_NAME,
    ERROR_QWEN_API_KEY_MISSING, 
    ERROR_QWEN_API_BASE_URL_MISSING, 
    ERROR_TAVILY_API_KEY_MISSING,
    MAX_SEARCH_LOOP,
    DEFAULT_NUMBER_QUERIES
)

from .prompts import answer_instructions,system_instructions

class SearchAgentConfig:
    """搜索智能体配置类"""
    
    def __init__(self):
        # 加载环境变量
        load_dotenv()
        
        # 验证和获取环境变量
        self.api_key = self._get_env_var(QWEN_API_KEY, ERROR_QWEN_API_KEY_MISSING)
        self.base_url = self._get_env_var(QWEN_API_BASE_URL, ERROR_QWEN_API_BASE_URL_MISSING)
        self.tavily_api_key = self._get_env_var(TAVILY_API_KEY, ERROR_TAVILY_API_KEY_MISSING)
        self.model_name = os.getenv(SEARCH_MODEL_NAME, DEFAULT_SEARCH_MODEL_NAME)
        
        # 初始化客户端
        self.llm = self._init_llm()
        self.tavily_client = self._init_tavily_client()
        
        # 配置系统提示
        self.system_prompt = self._init_system_prompt()

        self.default_number_queries = DEFAULT_NUMBER_QUERIES
        
        # 其他配置
        self.max_search_loop = MAX_SEARCH_LOOP
        self.heartbeat_interval = 30  # 心跳间隔（秒）
    
    def _get_env_var(self, var_name: str, error_message: str) -> str:
        """获取环境变量，如果不存在则抛出异常"""
        value = os.getenv(var_name)
        if not value:
            raise ValueError(error_message)
        return value
    
    def _init_llm(self) -> ChatOpenAI:
        """初始化语言模型客户端"""
        return ChatOpenAI(
            model=self.model_name, 
            api_key=self.api_key, 
            base_url=self.base_url, 
            temperature=0.7
        )
    
    def _init_tavily_client(self) -> TavilyClient:
        """初始化Tavily搜索客户端"""
        return TavilyClient(api_key=self.tavily_api_key)
    
    def _init_system_prompt(self) -> str:
        """初始化简单系统提示"""
        return system_instructions
    
    def update_system_prompts(self):
        """更新系统提示（例如，当日期变化时）"""
        self.system_prompt = self._init_system_prompt()
        self.reply_system_prompt = self._init_reply_system_prompt()


# 全局配置实例
config = SearchAgentConfig()


def get_config() -> SearchAgentConfig:
    """获取全局配置实例"""
    return config


def get_llm() -> ChatOpenAI:
    """获取语言模型实例"""
    return config.llm


def get_tavily_client() -> TavilyClient:
    """获取Tavily客户端实例"""
    return config.tavily_client


def get_system_prompt() -> str:
    """获取简单系统提示"""
    return config.system_prompt