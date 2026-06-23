/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer', 'puppeteer-core'],
		outputFileTracingIncludes: {
			'/api/sync': ['./node_modules/@sparticuz/chromium/**'],
			'/api/sync/route': ['./node_modules/@sparticuz/chromium/**'],
		},
	},
}
module.exports = nextConfig
