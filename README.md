# pi-anthropic-vertex

Standalone Anthropic Vertex provider extension for pi.

This package adds `anthropic-vertex` support even when your pi build does not include it in core.

## What it provides

- Registers provider: `anthropic-vertex`
- Registers Claude Vertex model list
- Implements Anthropic Vertex streaming via `@anthropic-ai/vertex-sdk`
- Supports both Google-standard and Claude-style project/region env vars

Project ID resolution order:

1. stream options `project`
2. `GOOGLE_CLOUD_PROJECT`
3. `GCLOUD_PROJECT`
4. `ANTHROPIC_VERTEX_PROJECT_ID`
5. `gcloud config get-value project`

Region resolution order:

1. stream options `region`
2. `GOOGLE_CLOUD_LOCATION`
3. `CLOUD_ML_REGION`
4. default `us-east5`

## Install

### From git

```bash
pi install git:github.com/basnijholt/pi-anthropic-vertex
```

### From local path

```bash
pi install ~/repos/pi-anthropic-vertex
```

## Usage

### Option A: service account credential file

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/claude-vertex-key.json"
export ANTHROPIC_VERTEX_PROJECT_ID="your-gcp-project-id"
export CLOUD_ML_REGION="us-east5"

pi --provider anthropic-vertex --model claude-opus-4-7@default
```

### Option B: gcloud ADC (no credential file)

```bash
gcloud auth application-default login
gcloud config set project your-gcp-project-id

export CLOUD_ML_REGION="us-east5"

pi --provider anthropic-vertex --model claude-opus-4-7@default
```

## One-off test (without install)

```bash
pi -e ~/repos/pi-anthropic-vertex \
  --provider anthropic-vertex \
  --model claude-opus-4-7@default
```
