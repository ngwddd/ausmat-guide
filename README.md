# AUSMAT 学习笔记（ausmat-guide）

> 本 README 于 2026-10-27 按仓库实际状态补写（此前仓库没有根 README）。

AUSMAT（西澳 WACE / ATAR 体系）2026 年 5 月入学一届学生的五科学习笔记。纯静态站点：没有框架、没有构建步骤，push 到 `main` 后由 GitHub Actions 把仓库根目录原样发布到 GitHub Pages。

- 线上地址：<https://ngwddd.github.io/ausmat-guide/>
- 仓库：<https://github.com/ngwddd/ausmat-guide>，主分支 `main`

## 页面一览

仓库里一共 20 个 HTML：根目录 2 个、`notes/` 11 个、`en/` 7 个。

| 页面 | 内容 | 规模 |
| --- | --- | --- |
| [index.html](index.html) / [en/index.html](en/index.html) | 首页与快速入口 | — |
| [notes/timetable.html](notes/timetable.html) | 考试日程表 | 37 项考核，日期从 2026/6/8 到 2027/2/13；五科权重表各自合计 100% |
| [notes/subjects.html](notes/subjects.html) | 五科要点 | 5 科（MAM / HBY / PHY / ELD / CSC）：权重构成 + 各项考核的内容范围 |
| [notes/timeline.html](notes/timeline.html) | 学期时间线 | 13 个周段，覆盖第 1–37 周 |
| [notes/glossary.html](notes/glossary.html) | 术语表 | 27 条，分 3 节 |
| [notes/papers.html](notes/papers.html) | 真题与资料 | 五科入口表 + 3 节（考官报告、逐年覆盖、整目录下载） |
| [notes/mindmap.html](notes/mindmap.html) | 知识导图 | 单页；中英同页切换（`?lang=zh` / `?lang=en`），`en/` 下没有单独文件 |
| [notes/advising/index.html](notes/advising/index.html) / [en.html](notes/advising/en.html) | 升学自检（中 / 英） | 30 条规则（其中 3 条 `enabled: false`）、54 条课程事实、16 所院校 |
| [notes/advising/guest.html](notes/advising/guest.html)、[en-guest.html](notes/advising/en-guest.html) | 旧地址跳转桩页 | `meta refresh` 回首页，带 `noindex` |
| [404.html](404.html) | 找不到页面 | 站内链接用 `/ausmat-guide/` 绝对路径 |

除知识导图外，8 个中文页面都有独立的英文页（`en/` 7 个 + `notes/advising/en.html`）。

## 目录结构

```text
.github/workflows/pages.yml   唯一的 CI 配置
assets/                       3 个：style.css、advising.css、advising.js
en/                           7 个英文页面
notes/                        16 个：11 个页面、4 个脚本（advising-rules.js、
                              courses.js、history.js、mindmap-i18n.js）、
                              1 个 README（advising/README.md）
vendor/katex/                 62 个：60 个字体文件 + katex.min.css + katex.min.js
根目录                        7 个：index.html、404.html、package.json、
                              pnpm-lock.yaml、robots.txt、sitemap.xml、.gitignore
```

`git ls-files` 合计 96 个文件。

## 部署

[.github/workflows/pages.yml](.github/workflows/pages.yml)：push 到 `main`（或手动 `workflow_dispatch`）触发，`actions/upload-pages-artifact@v3` 把仓库根目录（`path: .`）整包上传，再由 `actions/deploy-pages@v4` 发布。**没有构建步骤**——仓库里放的就是最终产物。

Pages 因此挂在 `/ausmat-guide/` 子路径下，`robots.txt` 与 `sitemap.xml` 里写的也是这个带前缀的地址。

## 本地预览

`package.json` 里**没有 `scripts` 字段**，所以没有 `pnpm run build` / `pnpm run dev` 这类命令可跑；本站也不需要构建。

- 用任意静态文件服务器即可，例如 `python -m http.server 8000` 后打开 `http://localhost:8000/`（临时起服务，仓库里没有对应脚本）。
- 直接打开 `index.html`，多数页面能看；但 `404.html` 用的是 `/ausmat-guide/` 绝对路径，只在部署到 Pages 子路径时才指得对——这不是坏链。
- [robots.txt](robots.txt) 只允许索引首页（`Disallow: /notes/`、`Disallow: /en/`）；[sitemap.xml](sitemap.xml) 列了 17 条 URL，`lastmod` 全是 2026-10-19，除知识导图外都带中英 `hreflang` 互指。

## 依赖

`package.json` 里就是这些，照原样列出：

- `dependencies`：`katex ^0.18.7`
- `devDependencies`：`playwright ^1.63.0`
- 锁文件：`pnpm-lock.yaml`（lockfileVersion 9.0，用 pnpm）

两处都和当前的用法不一致，先记下来，本次没有改动：

- **KaTeX 已不再被页面加载**：20 个 HTML 里 `katex` 出现 0 次，[assets/style.css](assets/style.css) 只剩 2 条 `.katex` 样式；`vendor/katex/` 的 62 个文件因此没有任何页面引用。公式是用 Unicode 字符直接写在页面源码里的（`∫` 29 处、`√` 28 处、`²` 146 处），页面里没有公式渲染脚本。
- **`playwright` 在版本库里没有使用者**：`verify.mjs`、`clicktest.mjs` 都写在 `.gitignore` 里，不在仓库中。

对应地，[notes/about.html](notes/about.html) 的「技术说明」里仍写着“公式排版所需的字体与脚本随本站提供”，与上面的现状不符。

## 数字怎么来的

上面每个数字都能在仓库里复核（2026-10-27 在本机跑的 PowerShell）：

```powershell
(git ls-files).Count                                                             # 96
(git ls-files '*.html').Count                                                    # 20
(git ls-files 'vendor/katex/*').Count                                            # 62
(Select-String -Path sitemap.xml -Pattern '<url>' -AllMatches).Matches.Count      # 17
(Select-String -Path notes/timetable.html -Pattern 'data-due=' -AllMatches).Matches.Count                    # 37
(Select-String -Path notes/glossary.html -Pattern 'id="g-' -AllMatches).Matches.Count                        # 27
(Select-String -Path notes/advising/advising-rules.js -Pattern 'when:' -AllMatches).Matches.Count            # 30
(Select-String -Path notes/advising/advising-rules.js -Pattern 'enabled: false,' -AllMatches).Matches.Count  # 3
(Select-String -Path notes/advising/courses.js -Pattern '"country":' -AllMatches).Matches.Count              # 54
(Select-String -Path (git ls-files '*.html') -Pattern 'katex' -AllMatches).Matches.Count                     # 0
```

16 所院校是从 `courses.js` 的 `"university"` 值去重数出来的；「五科权重各合计 100%」是把 `notes/timetable.html` 里 5 张小表的百分比逐项相加核对的；`∫` / `√` 的出现次数是在 20 个 HTML 里数出来的。

## 内容边界

与站内「关于」页一致：只收录个人整理的通用信息与原创讲解，不含学校发放的讲义、练习卷、试卷及其答案，也不含个人信息。升学自检是唯一需要填东西的地方，它在浏览器内运行，数据只写入 `localStorage`。

升学自检的规则库自述：所有数字是占位值，全部文案是为模板原创的示例，事实性表述在核实前显示为「待核实」（见 [notes/advising/README.md](notes/advising/README.md)）。该 README 也记着这个页面从未在真实浏览器里渲染验证过。

## 改内容时

- 仓库里没有生成脚本：这里存的就是成品 HTML，改内容就是直接改对应的 `.html`。
- 中英是两套独立文件，改中文页要顺手改 `en/` 下对应的那一份（知识导图除外，它只有一份文件）。
- 改完跑一遍上面那组计数命令，数字变了就同步改这份 README，再 push；push 到 `main` 会自动重新发布。
- 页面上「暂定」「以学校与 SCSA 官方文件为准」这类说明是刻意的，不要删。
