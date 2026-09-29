# 拾页 · 个人学习博客

一个可部署到 GitHub Pages 的中文学习博客，无需安装依赖。记录笔记、日志，保存文章链接和阅读心得。

## 日常使用

- **写笔记 / 写日志**：输入标题、标签和内容，保存本机草稿。
- **上传笔记**：导入 `.md`、`.markdown`、`.txt`，每个文件最多 200 KB，每次最多 30 个。PDF、Word 请先转为 Markdown 或文本。
- **收藏文章**：保存 HTTP/HTTPS 链接，并添加自己的总结；不会自动抓取原文。
- **搜索**：支持标题、正文、标签和链接；也可按类型和标签筛选。
- **公开发布**：在「博客设置与发布」中连接仓库后，发布单篇或所有草稿。
- **备份**：可导出 JSON 备份，再导入到其他浏览器。访问令牌不会包含在备份里。

## 跨设备与发布权限

博客已配置为 `zesty-chen/learning-notes` 的 `main` 分支。公开内容从仓库读取，任何设备打开网页都能阅读。

第一次发布时，在「博客设置与发布」填写 GitHub Fine-grained personal access token：

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens。
2. 只选择 `learning-notes` 这个仓库。
3. Repository permissions → Contents → Read and write。设置适当的到期时间。
4. 在博客设置中输入令牌并连接，然后点「公开发布」。

令牌仅在当前页面内存中使用，不写入源代码、本机存储或备份；刷新或关闭页面后需要重新输入。只会发送给 `https://api.github.com`。访客无法在没有仓库写入权限的情况下更改公开内容。

**保存草稿不等于发布。** 草稿仅在当前浏览器保存，清理网站数据会丢失草稿；建议定期导出备份。发布的内容和链接是公开的，删除后仍可能保留在 Git 历史中。

发布前会检查同一条记录是否在其他设备更新；遇到冲突会停止发布。此时先导出备份，在新浏览器标签页核对远端版本，再决定如何合并。不要直接覆盖他人的更新。

## 部署到 GitHub Pages

1. 将本目录文件上传至仓库根目录，包括 `index.html`、`style.css`、`app.js`、`data.json`、`config.json`、`favicon.svg` 和 `.nojekyll`。
2. 仓库 Settings → Pages → Build and deployment，选择 **Deploy from a branch**。
3. 选择 **main** 和 **/(root)**，保存。
4. 等 GitHub Pages 构建完成后访问 `https://zesty-chen.github.io/learning-notes/`。

如果复制到其他仓库，修改 `config.json` 的 `owner`、`repo`、`branch`。配置中绝对不要填写访问令牌。

## 本地预览

在本目录运行 `python -m http.server 4173`，打开 `http://localhost:4173/`。请通过 HTTP 服务访问，不要直接双击 HTML 文件，否则浏览器可能阻止读取 JSON 数据。

## 保存方式和边界

- `data.json` 存放已公开内容；GitHub Contents API 使用文件 SHA 防止并发覆盖。
- 新增及编辑内容先保存在当前浏览器，发布时与最新远端内容合并。
- 本机草稿总量限制 4 MB；单个内容文件公开发布限制 900 KB，适合轻量文本博客。
- Markdown 支持标题、无序列表、引用、代码块、行内代码、加粗和链接；原始 HTML 作为文字显示，不执行脚本，不加载外部图片。
- 公开内容依赖 GitHub API 和网络连接，API 受限时回退到最近部署的静态内容。
- 删除内容会生成待发布的删除操作。导入备份恢复记录，不自动执行备份中的删除操作。
- 网站无第三方脚本、追踪器、外部字体或额外收费服务。

## 官方参考

- [GitHub Pages 文档](https://docs.github.com/zh/pages)
- [配置 Pages 发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub 仓库 Contents API](https://docs.github.com/en/rest/repos/contents)
- [管理个人访问令牌](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
