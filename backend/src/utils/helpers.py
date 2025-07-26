"""
帮助工具模块

该模块包含应用程序中使用的各种帮助函数，用于发送节点执行更新、流消息更新等。
"""

from langgraph.config import get_stream_writer
import json

def custom_check_point_output(data: dict):
    """
    自定义检查点输出函数
    
    Args:
        data (dict): 要输出的数据
    """
    writer = get_stream_writer()  
    writer(data) 

def send_node_execution_update(node_name: str, message: str, status: str, data: dict = None):
    """
    发送节点执行更新
    
    Args:
        node_name (str): 节点名称
        message (str): 消息
        status (str): 状态
        data (dict, optional): 附加数据
    """
    custom_check_point_output({
        'node': node_name,
        'type': 'node_execute',
        'data': {
            'message': message,
            'status': status,
            'data': data or {}
        }
    })

def send_stream_message_update(node_name: str, message: str, status: str):
    """
    发送流消息更新
    
    Args:
        node_name (str): 节点名称
        message (str): 消息
        status (str): 状态
    """
    custom_check_point_output({
        'node': node_name,
        'type': 'update_stream_messages',
        'data': {
            'message': message,
            'status': status
        }
    })

def send_messages_update(node_name: str, messages: list):
    """
    发送消息更新
    
    Args:
        node_name (str): 节点名称
        messages (list): 消息列表
    """
    custom_check_point_output({
        'node': node_name,
        'type': 'update_messages',
        'data': {
            'messages': messages
        }
    })