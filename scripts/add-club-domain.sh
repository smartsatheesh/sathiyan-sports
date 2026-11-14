#!/usr/bin/env bash
# Gives a partner club its own site at <slug>.sathiyansports.in on the shared Cloud Run service.
# Cloud Run domain mappings don't support wildcards, so each club gets one mapping (free) plus
# one CNAME at the registrar. Usage: scripts/add-club-domain.sh <slug>
set -euo pipefail

SLUG="${1:?usage: $0 <club-slug>}"
BASE_DOMAIN="${BASE_DOMAIN:-sathiyansports.in}"
SERVICE="sathiyan-sports"
REGION="asia-southeast1"
PROJECT="inductive-voice-477212-d8"
DOMAIN="$SLUG.$BASE_DOMAIN"

if ! [[ "$SLUG" =~ ^[a-z0-9-]{2,40}$ ]] || [[ "$SLUG" == "www" ]]; then
  echo "Slug must be 2-40 lowercase letters, numbers or dashes" >&2
  exit 1
fi

echo "Mapping $DOMAIN -> Cloud Run service $SERVICE ($REGION)…"
gcloud beta run domain-mappings create --service "$SERVICE" --domain "$DOMAIN" --region "$REGION" --project "$PROJECT" || true

cat <<EOF

Now add this record at the registrar (GoDaddy → DNS for $BASE_DOMAIN):

  Type   Name    Value
  CNAME  $SLUG   ghs.googlehosted.com

Google issues the HTTPS certificate once the record is live (usually 15-30 minutes).
Check progress with:
  gcloud beta run domain-mappings describe --domain $DOMAIN --region $REGION --project $PROJECT

Before the DNS exists you can preview the club's site on the main domain with
  https://www.$BASE_DOMAIN/?club=$SLUG   (a preview cookie; ?club=sathiyan switches back)
EOF
