"""
常量定义模块

该模块包含应用程序中使用的所有常量定义，包括模型名称、系统提示词等。
"""

import os

# 环境变量名称常量
QWEN_API_KEY = "QWEN_API_KEY"
QWEN_API_BASE_URL = "QWEN_API_BASE_URL"
SEARCH_MODEL_NAME = "SEARCH_MODEL_NAME"
TAVILY_API_KEY = "TAVILY_API_KEY"

# 默认模型名称

# 错误消息常量
ERROR_QUERY_EMPTY = "Query cannot be empty"
ERROR_MESSAGES_NOT_LIST = "Messages must be a list"
ERROR_QWEN_API_KEY_MISSING = "QWEN_API_KEY 环境变量未设置"
ERROR_QWEN_API_BASE_URL_MISSING = "QWEN_API_BASE_URL 环境变量未设置"
ERROR_TAVILY_API_KEY_MISSING = "TAVILY_API_KEY 环境变量未设置"

# 提示词常量
DEFAULT_SEARCH_MODEL_NAME = "qwen-plus-latest"
DEFAULT_NUMBER_QUERIES = 3

# 最大搜索循环次数
MAX_SEARCH_LOOP = 3

# 系统提示词
SYSTEM_PROMPT_TEMPLATE = "You are a helpful robot,current time is:{current_time},no_think."

# 简单的系统提示，用于普通对话
SIMPLE_SYSTEM_PROMPT = SYSTEM_PROMPT_TEMPLATE.format(current_time="{current_time}")