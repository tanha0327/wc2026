/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer', 'puppeteer-core'],
	},
}
module.exports = nextConfig
