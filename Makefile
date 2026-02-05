DOCKER_IMAGE_NAME = wallet-valuator/dev
DOCKER_IMAGE_VERSION = 2.1.0
DOCKER = sudo docker
DOCKER_CONTEXT = ./docker/
DOCKERFILE = $(DOCKER_CONTEXT)/Dockerfile

WORKSPACE ?= $$(pwd)

.PHONY: docker-image shell vs-code configure clean test build-all compile archive

DOCKER_IMAGE_TAG ?= $(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_VERSION)

docker-image: $(DOCKERFILE)
	@echo "$(DOCKER_DOCKER_IMAGE_TAG)"
	$(DOCKER) build -f $(DOCKERFILE) -t $(DOCKER_IMAGE_TAG) $(DOCKER_CONTEXT)

# Start a new container and drop into an interactive bash shell
docker-shell: docker-image
	$(DOCKER) run -it --rm \
		--memory=3g \
		--user "$$(id -u):$$(id -g)" \
		-e TERM="$$TERM" \
		--mount type=bind,src="$(WORKSPACE)",dst=/app \
		--mount type=bind,src="$(WORKSPACE)/user",dst=/home \
		"$(DOCKER_IMAGE_TAG)" /bin/bash

# Start a new container and run the full test suite
docker-compile: docker-image
	$(DOCKER) run -it --rm \
		--memory=3g \
		--user "$$(id -u):$$(id -g)" \
		-e TERM="$$TERM" \
		--mount type=bind,src="$(WORKSPACE)",dst=/app \
		--mount type=bind,src="$(WORKSPACE)/user",dst=/home \
		"$(DOCKER_IMAGE_TAG)" /bin/sh -c "tsc -w"

# Start a new container and run the full test suite
docker-test: docker-image
	$(DOCKER) run --rm \
		--memory=3g \
		--user "$$(id -u):$$(id -g)" \
		-e TERM="$$TERM" \
		--mount type=bind,src="$(WORKSPACE)",dst=/app \
		--mount type=bind,src="$(WORKSPACE)/user",dst=/home \
		"$(DOCKER_IMAGE_TAG)" /bin/sh -c "npm test"

DEV_CONTAINER ?=
vscode:
ifndef DEV_CONTAINER
	@echo "Error: DEV_CONTAINER not specified"
	@echo "Usage: make vscode DEV_CONTAINER=my-container-name-or-id"
	@exit 1
else
	code --folder-uri "vscode-remote://attached-container+$$(echo -n "$(DEV_CONTAINER)" | xxd -p)/app"
endif


clean:
	rm -rf build/

ARCHIVE-PATH ?=
archive: ARCHIVE_NAME = archive-$(shell date +%Y%m%d)-$(shell git rev-parse --short HEAD).tar.gz
archive:
	git archive -o $(ARCHIVE_NAME) HEAD -- $(ARCHIVE-PATH)

