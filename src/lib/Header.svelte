<header class="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
	<div class="container mx-auto px-4">
		<div class="flex justify-between items-center h-16">
			<div class="flex items-center space-x-4">
				<a href="/" class="text-xl font-semibold text-gray-900">
					College Tracker
				</a>
				<a 
					href="/" 
					class="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
					title="Home"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
					</svg>
				</a>
			</div>
			
			<nav class="flex items-center space-x-4">
				<a 
					href="/school" 
					class="bg-transparent text-black border border-black px-4 py-2 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium"
				>
					Add Schools
				</a>
				<form method="POST" action="/logout">
					<button 
						type="submit"
						class="text-gray-600 hover:text-gray-900 text-sm font-medium"
					>
						Logout
					</button>
				</form>
			</nav>
		</div>
	</div>
</header>