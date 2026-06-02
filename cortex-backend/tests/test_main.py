from app.main import create_app


class TestMain:
    def test_create_app_includes_expected_routes(self) -> None:
        application = create_app()
        paths = {route.path for route in application.routes}

        assert '/health' in paths
        assert '/auth/login' in paths
        assert '/auth/register' in paths
