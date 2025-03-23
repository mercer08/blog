import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Zaler's Blog",
  description: "a blog of writing",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: '文章', link: '/note/ubuntu 核显直通' },
    ],

    sidebar: [
      {
        text: '文章',
        items: [
          { text: 'Ubuntu 核显直通', link: '/note/ubuntu 核显直通' },
          { text: 'Markdown Examples', link: '/note/markdown-examples' },
          { text: 'Runtime API Examples', link: '/note/api-examples' },
          { text: 'Mac mini 外置磁盘升级系统', link: '/note/updateMacOS' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
