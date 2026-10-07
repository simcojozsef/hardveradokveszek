<!DOCTYPE html>
<html lang="hu">
<head>
    <link rel="icon" href="{{ asset('images/website-images/favicon.ico') }}" type="image/x-icon">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>GigaPiac</title>

    {{--
        Apply the saved theme before the app paints, so a dark-mode user never
        sees a flash of the light theme on load. Must run before the bundle.
    --}}
    <script>
        (function () {
            try {
                var stored = localStorage.getItem('gigapiac.theme');
                var theme = stored === 'dark' ? 'dark' : 'light';
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.colorScheme = theme;
            } catch (e) {
                document.documentElement.dataset.theme = 'light';
            }
        })();
    </script>

    @viteReactRefresh
    @vite('resources/js/app.jsx')
</head>
<body>
    <div id="app"></div>
</body>
</html>