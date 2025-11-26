#!/bin/bash

# 测试钩子密码输入功能的脚本
# 这个脚本演示了如何创建需要交互式输入的钩子命令

echo "=== Hook Password Input Test Script ==="
echo ""

# 测试 1: 简单的用户输入
echo "Test 1: Simple user input"
read -p "Enter your name: " name
echo "Hello, $name!"
echo ""

# 测试 2: 密码样式输入（不显示字符）
echo "Test 2: Password-style input"
read -sp "Enter a secret: " secret
echo ""
echo "You entered: $secret"
echo ""

# 测试 3: 多个输入
echo "Test 3: Multiple inputs"
read -p "First question - Enter a number: " num
read -p "Second question - Enter a color: " color
echo "You chose number $num and color $color"
echo ""

# 测试 4: 条件输入
echo "Test 4: Conditional input"
read -p "Do you want to continue? (y/n): " answer
if [ "$answer" = "y" ]; then
    echo "Continuing..."
    read -p "Enter final message: " msg
    echo "Final message: $msg"
else
    echo "Stopped."
fi

echo ""
echo "=== Test Complete ==="

