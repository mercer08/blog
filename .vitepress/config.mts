import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Zaler's Blog",
  description: "a blog of writing",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: '文章', link: '/note/dae 配置指南' },
    ],

    sidebar: [
      {
        text: '文章',
        items: [
          { text: 'Dae 配置指南', link: '/note/dae 配置指南' },
          { text: 'Ubuntu 核显直通', link: '/note/ubuntu 核显直通' },
          { text: 'Mac mini 外置磁盘升级系统', link: '/note/updateMacOS' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/mercer08' }
    ]
  }
})
