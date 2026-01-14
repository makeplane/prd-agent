export interface OAuthSuccessTemplateData {
  workspace_id: string;
  workspace_slug: string;
  app_installation_id: string;
  plane_base_url: string;
}

export function getOAuthSuccessTemplate(data: OAuthSuccessTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App Connected</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 480px;
            width: 100%;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
        }

        .success-icon {
            width: 40px;
            height: 40px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .checkmark {
            width: 20px;
            height: 20px;
            color: white;
        }

        h1 {
            color: #111;
            font-size: 20px;
            font-weight: 600;
        }

        .description {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 24px;
        }

        .details {
            background: #fafafa;
            border: 1px solid #eee;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 24px;
        }

        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
        }

        .detail-item:not(:last-child) {
            border-bottom: 1px solid #eee;
        }

        .detail-label {
            color: #666;
            font-size: 13px;
        }

        .detail-value {
            color: #111;
            font-size: 13px;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
            background: #eee;
            padding: 4px 8px;
            border-radius: 4px;
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .button {
            display: inline-block;
            background: #111;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            transition: background 0.15s ease;
        }

        .button:hover {
            background: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">
                <svg class="checkmark" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
            </div>
            <h1>App Connected</h1>
        </div>

        <p class="description">The app has been successfully installed to your workspace. You can now mention the app in work item comments to use it.</p>

        <div class="details">
            <div class="detail-item">
                <span class="detail-label">Workspace</span>
                <span class="detail-value">${data.workspace_slug}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Workspace ID</span>
                <span class="detail-value">${data.workspace_id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Installation ID</span>
                <span class="detail-value">${data.app_installation_id}</span>
            </div>
        </div>

        <a href="${data.plane_base_url}" class="button">Go to Plane</a>
    </div>
</body>
</html>`;
}
