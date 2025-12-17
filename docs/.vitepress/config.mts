import { defineConfig } from 'vitepress'

export default defineConfig({
    title: "Chronoscribe",
    description: "A unified local-dev log aggregator",
    themeConfig: {
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Guide', link: '/guide/getting-started' }
        ],

        sidebar: [
            {
                text: 'Guide',
                items: [
                    { text: 'Getting Started', link: '/guide/getting-started' },
                    { text: 'Usage', link: '/guide/usage' },
                    { text: 'Configuration', link: '/guide/configuration' }
                ]
            }
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/greg-py/chronoscribe' }
        ]
    }
})
