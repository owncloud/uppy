ALPINE_GIT = "alpine/git:latest"
OC_CI_ALPINE = "owncloudci/alpine:latest"
OC_CI_BAZEL_BUILDIFIER = "owncloudci/bazel-buildifier"
OC_CI_NODEJS = "owncloudci/nodejs:18"
PLUGINS_DOCKER = "plugins/docker:20.14"
PLUGINS_GIT_ACTION = "plugins/git-action:1"
PLUGINS_GITHUB_RELEASE = "plugins/github-release:1"

def main(ctx):
    before = beforePipelines(ctx)

    stages = pipelinesDependsOn(stagePipelines(ctx), before)

    if (stages == False):
        print("Errors detected. Review messages above.")
        return []

    after = pipelinesDependsOn(afterPipelines(ctx), stages)

    pipelines = before + stages + after

    pipelineSanityChecks(ctx, pipelines)
    return pipelines

def beforePipelines(ctx):
    return checkStarlark() + lint(ctx)

def stagePipelines(ctx):
    return []

def afterPipelines(ctx):
    return build(ctx)

def lint(ctx):
    pipelines = []

    result = {
        "kind": "pipeline",
        "type": "docker",
        "name": "lint",
        "steps": [{
            "name": "lint",
            "image": OC_CI_NODEJS,
            "commands": [
                "yarn set version 3.6.1",
                "yarn",
                "yarn lint",
            ],
        }],
        "trigger": {
            "ref": [
                "refs/heads/main",
                "refs/tags/**",
                "refs/pull/**",
            ],
        },
    }

    pipelines.append(result)

    return pipelines

def build(ctx):
    pipelines = []
    steps = buildRelease(ctx) + buildDockerImage(ctx)

    result = {
        "kind": "pipeline",
        "type": "docker",
        "name": "build",
        "steps": steps,
        "trigger": {
            "ref": [
                "refs/heads/main",
                "refs/tags/**",
                "refs/pull/**",
            ],
        },
    }

    pipelines.append(result)

    return pipelines

def buildDockerImage(ctx):
    return [
        {
            "name": "docker",
            "image": PLUGINS_DOCKER,
            "settings": {
                "username": {
                    "from_secret": "docker_username",
                },
                "password": {
                    "from_secret": "docker_password",
                },
                "auto_tag": ctx.build.event == "tag",
                "dockerfile": "Dockerfile",
                "repo": "owncloud/uppy-companion",
                "dry_run": ctx.build.event != "tag",
            },
            "depends_on": ["clone"],
        },
    ]

def determineReleaseVersion(ctx):
    return ctx.build.ref.replace("refs/tags/v", "")

def buildRelease(ctx):
    version = determineReleaseVersion(ctx)

    return [
        {
            "name": "build",
            "image": OC_CI_NODEJS,
            "commands": [
                "yarn set version 3.6.1",
                "yarn",
                "yarn run build",
                "yarn workspaces foreach pack",
                "./collect_release_artifacts.sh",
            ],
            "depends_on": ["clone"],
        },
        {
            "name": "publish",
            "image": PLUGINS_GITHUB_RELEASE,
            "settings": {
                "api_key": {
                    "from_secret": "github_token",
                },
                "files": [
                    "release/*",
                ],
                "checksum": [
                    "md5",
                    "sha256",
                ],
                "title": ctx.build.ref.replace("refs/tags/v", ""),
                "overwrite": True,
            },
            "when": {
                "ref": [
                    "refs/tags/**",
                ],
            },
        },
    ]

def checkStarlark():
    return [{
        "kind": "pipeline",
        "type": "docker",
        "name": "check-starlark",
        "steps": [
            {
                "name": "format-check-starlark",
                "image": OC_CI_BAZEL_BUILDIFIER,
                "commands": [
                    "buildifier --mode=check .drone.star",
                ],
            },
            {
                "name": "show-diff",
                "image": OC_CI_BAZEL_BUILDIFIER,
                "commands": [
                    "buildifier --mode=fix .drone.star",
                    "git diff",
                ],
                "when": {
                    "status": [
                        "failure",
                    ],
                },
            },
        ],
        "trigger": {
            "ref": [
                "refs/pull/**",
            ],
        },
    }]

def pipelineDependsOn(pipeline, dependant_pipelines):
    if "depends_on" in pipeline.keys():
        pipeline["depends_on"] = pipeline["depends_on"] + getPipelineNames(dependant_pipelines)
    else:
        pipeline["depends_on"] = getPipelineNames(dependant_pipelines)
    return pipeline

def pipelinesDependsOn(pipelines, dependant_pipelines):
    pipes = []
    for pipeline in pipelines:
        pipes.append(pipelineDependsOn(pipeline, dependant_pipelines))

    return pipes

def getPipelineNames(pipelines = []):
    """getPipelineNames returns names of pipelines as a string array

    Args:
      pipelines: array of drone pipelines

    Returns:
      names of the given pipelines as string array
    """
    names = []
    for pipeline in pipelines:
        names.append(pipeline["name"])
    return names

def pipelineSanityChecks(ctx, pipelines):
    """pipelineSanityChecks helps the CI developers to find errors before running it

    These sanity checks are only executed on when converting starlark to yaml.
    Error outputs are only visible when the conversion is done with the drone cli.

    Args:
      ctx: drone passes a context with information which the pipeline can be adapted to
      pipelines: pipelines to be checked, normally you should run this on the return value of main()

    Returns:
      none
    """

    # check if name length of pipeline and steps are exceeded.
    max_name_length = 50
    for pipeline in pipelines:
        pipeline_name = pipeline["name"]
        if len(pipeline_name) > max_name_length:
            print("Error: pipeline name %s is longer than 50 characters" % (pipeline_name))

        for step in pipeline["steps"]:
            step_name = step["name"]
            if len(step_name) > max_name_length:
                print("Error: step name %s in pipeline %s is longer than 50 characters" % (step_name, pipeline_name))

    # check for non existing depends_on
    possible_depends = []
    for pipeline in pipelines:
        possible_depends.append(pipeline["name"])

    for pipeline in pipelines:
        if "depends_on" in pipeline.keys():
            for depends in pipeline["depends_on"]:
                if not depends in possible_depends:
                    print("Error: depends_on %s for pipeline %s is not defined" % (depends, pipeline["name"]))

    # check for non declared volumes
    for pipeline in pipelines:
        pipeline_volumes = []
        if "volumes" in pipeline.keys():
            for volume in pipeline["volumes"]:
                pipeline_volumes.append(volume["name"])

        for step in pipeline["steps"]:
            if "volumes" in step.keys():
                for volume in step["volumes"]:
                    if not volume["name"] in pipeline_volumes:
                        print("Warning: volume %s for step %s is not defined in pipeline %s" % (volume["name"], step["name"], pipeline["name"]))

    # list used docker images
    print("")
    print("List of used docker images:")

    images = {}

    for pipeline in pipelines:
        for step in pipeline["steps"]:
            image = step["image"]
            if image in images.keys():
                images[image] = images[image] + 1
            else:
                images[image] = 1

    for image in images.keys():
        print(" %sx\t%s" % (images[image], image))
