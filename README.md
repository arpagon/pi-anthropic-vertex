# pi-anthropic-vertex-compat

Compatibility extension for pi's built-in `anthropic-vertex` provider.

It lets you keep Claude Code style env vars and still use `pi --provider anthropic-vertex`.

## What it does

Adds fallback mapping at runtime:

- `ANTHROPIC_VERTEX_PROJECT_ID` -> Vertex project
- `CLOUD_ML_REGION` -> Vertex region (fallback)

It still respects native pi vars first:

- `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_APPLICATION_CREDENTIALS`

## Install

### Local path

```bash
pi install ~/repos/pi-anthropic-vertex
```

### Git (after you push)

```bash
pi install git:github.com/basnijholt/pi-anthropic-vertex
```

## Usage

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/claude-vertex-key.json"
export ANTHROPIC_VERTEX_PROJECT_ID="gen-lang-client-XXXXXX"
export CLOUD_ML_REGION="us-east5"

pi --provider anthropic-vertex --model claude-opus-4-6@default
```

Or for one-off testing without install:

```bash
pi -e ~/repos/pi-anthropic-vertex \
  --provider anthropic-vertex \
  --model claude-opus-4-6@default
```
