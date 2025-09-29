<script lang="ts">
	import { enhance } from '$app/forms';
	
	let { form }: { form: any } = $props();
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
			Sign in to College Tracker
		</h2>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			<form method="POST" action="?/login" use:enhance>
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">
						Email address
					</label>
					<div class="mt-1">
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
							placeholder="Enter your email"
						/>
					</div>
				</div>

				<div class="mt-6">
					<label for="password" class="block text-sm font-medium text-gray-700">
						Password
					</label>
					<div class="mt-1">
						<input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
							class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
							placeholder="Enter your password"
						/>
					</div>
				</div>

				{#if form?.error}
					<div class="mt-4 text-sm text-red-600">
						{form.error}
					</div>
				{/if}

				<div class="mt-6">
					<button
						type="submit"
						class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
					>
						Sign in
					</button>
				</div>

				<div class="mt-6">
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-gray-300" />
						</div>
						<div class="relative flex justify-center text-sm">
							<span class="px-2 bg-white text-gray-500">Demo Accounts</span>
						</div>
					</div>

					<div class="mt-4 space-y-2 text-sm text-gray-600">
						<p class="text-center">Use these demo credentials:</p>
						<p class="text-center font-mono">demo@example.com / password</p>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>