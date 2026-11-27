# AUSMAT 学习工作台 · v2.2

面向 AUSMAT / WACE 学生的中英双语学习网站，包含科目资料、考核日程、知识导图、ATAR 估算和国际升学资料。

- [打开 GitHub Pages](https://ngwddd.github.io/ausmat-guide/)
- [查看 GitHub 版本记录](https://github.com/ngwddd/ausmat-guide/releases)

## 功能

- [科目资料库](https://ngwddd.github.io/ausmat-guide/#resources)支持科目、类型和关键词筛选。
- [考试日程](https://ngwddd.github.io/ausmat-guide/#timetable)记录 Sunway 2026 年 5 月入学批次，实际安排以学校通知为准。
- [知识导图](https://ngwddd.github.io/ausmat-guide/#mindmap)支持搜索、分支展开、拖动和缩放。
- [ATAR 估算](https://ngwddd.github.io/ausmat-guide/#advising)使用站点历史模型。正式排名请查阅 [TISC 计分规则](https://www.tisc.edu.au/static/guide/atar-about.tisc)。



## 版本记录

| 版本 | 更新 |
| --- | --- |
| v2.2 | 单页路由与模块化重构，保留旧入口跳转。 |

历史快照保留各版本的主要功能，并统一采用清理后的知识导图与 ATAR 页面。个人备考内容、分组标识和旧升学自检已从公开快照移除。

## 本地运行与部署

在仓库根目录运行 `python -m http.server 8000`，然后访问 <http://localhost:8000/>。站点直接运行 HTML、CSS 和原生 JavaScript 模块，无需构建步骤。

`index.html` 是单页应用入口，`assets/` 包含页面及功能模块，`notes/` 和 `en/` 保留旧地址跳转。GitHub Pages 使用仓库根目录，由 [Pages 工作流](.github/workflows/pages.yml)发布。
