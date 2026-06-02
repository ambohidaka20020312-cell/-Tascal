.PHONY: dev dev-down prod prod-down migrate logs test

dev:
	docker-compose up -d

dev-down:
	docker-compose down

prod:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

migrate:
	docker-compose exec backend flask db upgrade

logs:
	docker-compose logs -f

test:
	docker-compose exec backend pytest
