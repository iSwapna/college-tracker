<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
			Sign in to College Tracker
		</h2>
		<p class="mt-2 text-center text-sm text-gray-600">
			Track your college applications and deadlines
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			<div class="space-y-4">
				<a
					href="/api/auth/login"
					class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
				>
					Sign in with Kinde
				</a>

				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-gray-300" />
					</div>
					<div class="relative flex justify-center text-sm">
						<span class="px-2 bg-white text-gray-500">Or</span>
					</div>
				</div>

				<a
					href="/api/auth/register"
					class="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
				>
					Create an account
				</a>
			</div>

			<div class="mt-6">
				<p class="text-center text-xs text-gray-500">
					Secure authentication powered by Kinde
				</p>
			</div>
		</div>
	</div>
</div>