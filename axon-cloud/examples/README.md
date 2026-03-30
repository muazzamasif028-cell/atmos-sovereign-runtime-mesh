# Axon Cloud — Workflow Examples

This directory contains production-ready example workflows for the **Axon Cloud** workflow engine (part of the `atmos-sovereign-runtime-mesh` platform). Each example is a fully annotated JSON file that can be imported directly into the engine or used as a starting template.

---

## `order-processing-workflow.json`

### Overview

A complete **e-commerce order processing** pipeline that demonstrates every one of the 12 available node types working together in a realistic, production-like scenario.

```
Storefront Webhook
       │
       ├──► Fetch Customer Profile (HTTP)
       │
       └──► Query Inventory (Database)
                    │
             Enrich Order Data (Transform)
                    │
           All Items In Stock? (Condition)
                    │
          ┌─────────┴──────────┐
       In Stock           Out of Stock
          │                    │
   Process Items (Loop)   Register Backorder (HTTP)
          │                    │
   Calculate Price (Code)      │
          │                    │
          └─────────┬──────────┘
             Merge Results (Merge)
                    │
           Wait 3 seconds (Delay)
                    │
          ┌─────────┴──────────┐
   Send Confirmation (Email)  Notify WMS (Webhook)
```

### Node Types Used

| # | Node Type      | Node ID                    | Purpose |
|---|----------------|----------------------------|---------|
| 1 | `trigger`      | `node_trigger_order`       | Receives inbound order webhook from storefront with HMAC signature verification |
| 2 | `http_request` | `node_http_customer`       | Fetches full customer profile from CRM REST API with retry logic |
| 3 | `database`     | `node_db_inventory`        | Queries PostgreSQL inventory table for stock levels across all ordered SKUs |
| 4 | `transform`    | `node_transform_enrich`    | Merges order, customer, and inventory data into a single enriched object |
| 5 | `condition`    | `node_condition_stock`     | Branches execution based on whether all items are in stock |
| 6 | `split`        | `node_split_branches`      | Fans out to two independent paths: in-stock fulfillment vs. backorder |
| 7 | `loop`         | `node_loop_items`          | Iterates over each order item to process pricing individually |
| 8 | `code`         | `node_code_price`          | Inline JavaScript that calculates line-item totals with loyalty discounts and tax |
| 9 | `http_request` | `node_http_backorder`      | Registers out-of-stock items with the supplier backorder API |
| 10 | `merge`       | `node_merge_branches`      | Waits for whichever branch completed and assembles the final order summary |
| 11 | `delay`       | `node_delay_confirmation`  | Pauses 3 seconds to let DB writes commit before sending notifications |
| 12 | `email`       | `node_email_confirmation`  | Sends a transactional confirmation email with dynamic template selection |
| 13 | `webhook`     | `node_webhook_fulfillment` | Pushes signed order payload to the warehouse management system |

> **Note:** The workflow uses `http_request` twice (nodes 2 and 9) to show it in both a read and a write context. All 12 distinct node types are covered.

---

### Key Concepts Demonstrated

#### Parallel Fan-Out (Trigger → HTTP + Database)
The trigger node fans out to both `node_http_customer` and `node_db_inventory` simultaneously. The `transform` node downstream waits for both to complete before proceeding — this is implicit fan-in based on the edge graph.

#### Conditional Branching (Condition + Split)
The `condition` node evaluates a boolean expression and writes its result to `outputs.branch`. The `split` node reads that value and routes execution to exactly one of its named branches. This pattern keeps branching logic explicit and auditable.

#### Loop + Code Composition
The `loop` node iterates over `enriched_order.items` and calls `node_code_price` for each element. The `code` node receives the current item via `loop.current_item` and the full order context via `input_bindings`. Results are accumulated into `loop.accumulated_results` and exposed as `processed_items`.

#### Branch Convergence (Merge)
The `merge` node uses `strategy: first_completed` — it unblocks as soon as the active branch finishes (only one of the two split branches will ever run per execution). The `output_mapping` uses `| default(...)` guards so references to the inactive branch's outputs resolve to safe fallback values.

#### Graceful Error Handling
- `node_http_backorder` uses `on_error: continue` with an `on_error_default` object, so a supplier API outage doesn't abort the entire workflow.
- `node_email_confirmation` also uses `on_error: continue` — a failed email send is logged but does not prevent the fulfillment webhook from firing.
- `node_webhook_fulfillment` retries up to 5 times with exponential backoff before giving up.

#### Data Flow Between Nodes
All inter-node data references use the `{{nodes.<node_id>.outputs.<key>}}` template syntax. The `transform` node is the canonical place to reshape and index data — downstream nodes reference `enriched_order` rather than reaching back to multiple earlier nodes.

---

### Required Environment Variables

| Variable | Description |
|---|---|
| `CRM_API_BASE_URL` | Base URL of the CRM REST API |
| `CRM_API_KEY` | Bearer token for CRM API authentication |
| `INVENTORY_DB_URL` | PostgreSQL connection string for the inventory database |
| `SUPPLIER_API_BASE_URL` | Base URL of the supplier backorder API |
| `SUPPLIER_API_KEY` | Bearer token for supplier API authentication |
| `FULFILLMENT_WEBHOOK_URL` | Outbound webhook URL for the warehouse management system |
| `FULFILLMENT_WEBHOOK_SECRET` | HMAC secret for signing outbound fulfillment payloads |
| `STOREFRONT_WEBHOOK_SECRET` | HMAC secret for verifying inbound storefront webhooks |
| `EMAIL_PROVIDER` | Email provider: `sendgrid`, `mailgun`, or `ses` |
| `EMAIL_DOMAIN` | Sending domain, e.g. `mystore.com` |
| `STORE_NAME` | Human-readable store name for the email From header |
| `EMAIL_TEMPLATE_CONFIRMED` | Template ID for the order-confirmed email |
| `EMAIL_TEMPLATE_BACKORDER` | Template ID for the backorder notification email |
| `SUPPORT_EMAIL` | Customer support reply-to address |
| `APP_BASE_URL` | Public base URL of this application |

---

### Importing the Workflow

#### Via the API

```bash
curl -X POST https://<your-axon-host>/api/workflows/import \
  -H "Authorization: Bearer $AXON_API_KEY" \
  -H "Content-Type: application/json" \
  -d @order-processing-workflow.json
```

#### Via the Examples Endpoint

The workflow engine exposes a built-in examples endpoint that returns this file pre-parsed:

```bash
curl https://<your-axon-host>/api/workflows/examples \
  -H "Authorization: Bearer $AXON_API_KEY"
```

Response:

```json
{
  "examples": [
    {
      "id": "order-processing",
      "name": "E-Commerce Order Processing",
      "description": "...",
      "tags": ["ecommerce", "orders", "fulfillment"],
      "node_count": 13,
      "node_types_used": ["trigger", "http_request", "database", "transform", "condition", "split", "loop", "code", "merge", "delay", "email", "webhook"],
      "workflow": { ... }
    }
  ]
}
```

---

### Customising the Workflow

**Swap the email provider:** Change `EMAIL_PROVIDER` to `ses`, `mailgun`, or `sendgrid`. The `email` node config is provider-agnostic; the engine resolves the correct adapter at runtime.

**Add more order items:** The `loop` node handles any number of items up to `max_iterations: 100`. Increase this limit in the node config if your orders can exceed 100 line items.

**Change the tax logic:** All tax and discount logic lives in `node_code_price`. Edit the `TAX_RATES` and `PROMO_CODES` objects in the inline code, or replace the inline code with a call to an external tax service by swapping the `code` node for an `http_request` node.

**Add a fraud check:** Insert a new `http_request` node between `node_transform_enrich` and `node_condition_stock` that calls a fraud-scoring API. Add a second `condition` node to abort the workflow if the fraud score exceeds a threshold.

---

## Adding More Examples

Place new example files in this directory following the naming convention `<use-case>-workflow.json`. The `GET /api/workflows/examples` endpoint automatically discovers and serves all `*-workflow.json` files in this directory.
