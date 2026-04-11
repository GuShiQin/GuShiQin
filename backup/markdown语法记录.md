强调关键信息使用：https://blog.meekdai.com/post/%E3%80%90Gmeek-jin-jie-%E3%80%91-qiang-diao-guan-jian-xin-xi-shi-yong.html

html标签：https://blog.meekdai.com/post/%E3%80%90Gmeek-jin-jie-%E3%80%91-wen-zhang-cha-ru-html-biao-qian.html
添加网页计数功能："allHead":"<script src='https://blog.meekdai.com/Gmeek/plugins/GmeekBSZ.js'></script>",


---

# 🧠 Gmeek 常用 Markdown 语法速查笔记

## 一、基础排版

### 1. 标题
```markdown
# 一级标题（文章标题）
## 二级标题
### 三级标题
#### 四级标题
```

### 2. 段落与换行
直接写文字就是段落。  
换行需要在行末加 **两个空格** 再回车，或者直接空一行。

### 3. 强调
```markdown
**粗体**  
*斜体*  
~~删除线~~
```

### 4. 列表
**无序列表**：用 `-`、`*` 或 `+`
```markdown
- 项目1
- 项目2
  - 嵌套项目
```

**有序列表**：数字 + 点
```markdown
1. 第一步
2. 第二步
   1. 小步骤
```

### 5. 引用
```markdown
> 这是一段引用
> 可以换行继续写
```

---

## 二、链接与图片

### 1. 普通链接
```markdown
[Gmeek 官网](https://github.com/Meekdai/Gmeek)
```

### 2. 图片
```markdown
![图片描述](图片URL地址)
```

**Gmeek 小技巧**：如果你把图片放在 GitHub 仓库的 `image` 文件夹，可以用相对路径：
```markdown
![头像](/image/avatar.png)
```

### 3. 自动链接
用 `< >` 包裹 URL 或邮箱：
```markdown
<https://example.com>  
<name@email.com>
```

---

## 三、代码与高亮

### 1. 行内代码
```markdown
用反引号包起来，比如 `console.log('hello')`
```

### 2. 代码块
用三个反引号，后面写上语言名称（可选）：
````markdown
```python
print("Hello, Gmeek!")
```
````

常用语言标识：`python`, `javascript`, `html`, `css`, `bash`, `json`, `markdown`

---

## 四、表格
```markdown
| 姓名 | 年龄 | 职业 |
|------|------|------|
| 张三 | 25   | 程序员 |
| 李四 | 30   | 设计师 |
```

对齐方式：
```markdown
| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
| 内容   | 内容     | 内容   |
```

---

## 五、Gmeek 专属特性

### 1. 文章元数据（Front Matter）
在文章 **最顶部** 用 `---` 包裹，用来设置标题、标签、置顶等。
```yaml
---
title: 我的第一篇博客
tags:
  - 教程
  - Markdown
date: 2026-04-09
top: 1
---
```

### 2. 隐藏内容（折叠块）
Gmeek 支持使用 HTML `<details>` 标签：
```html
<details>
<summary>点击展开查看详情</summary>

这里是被折叠的内容，可以是任何 Markdown。
- 列表1
- 列表2

</details>
```

### 3. 任务列表（待办清单）
```markdown
- [x] 已完成任务
- [ ] 未完成任务
- [ ] 学习 Gmeek
```

### 4. 脚注
```markdown
这是一个带有脚注的句子[^1]。

[^1]: 这里是脚注的解释内容。
```

### 5. 高亮文字
```markdown
==这段文字会被高亮==
```
（GitHub Flavored Markdown 原生不支持，但 Gmeek 可能支持，具体看主题）

---

## 六、写博客的流程提示（帮你记住）

1. 在 GitHub 仓库的 **Issues** 页面新建 Issue。
2. 标题就是文章标题，内容用上述 Markdown 编写。
3. 添加标签（Labels）作为分类。
4. 发布后等待 GitHub Actions 自动构建，几分钟后你的个人网站就会更新。

---

## 📌 快速参考卡

| 效果       | 语法                           |
|------------|--------------------------------|
| 标题       | `# H1` `## H2`                 |
| 粗体       | `**文字**`                     |
| 斜体       | `*文字*`                       |
| 链接       | `[文字](网址)`                 |
| 图片       | `![替代](网址)`                |
| 代码行     | `` `code` ``                   |
| 代码块     | ` ```语言 `                    |
| 引用       | `> 内容`                       |
| 无序列表   | `- 项目`                       |
| 有序列表   | `1. 项目`                      |
| 表格       | `\| 表头 \| 表头 \|`           |
| 任务列表   | `- [ ] 待办`                   |
| 脚注       | `[^标识]`                      |
| 折叠块     | `<details><summary>标题</summary>内容</details>` |

---

你可以把这份笔记保存为 `Gmeek语法.md`，写博客时随时对照查看。如果有特定想了解的进阶用法，随时告诉我！