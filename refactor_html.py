with open('static/dashboard.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Navigation
nav_old = """                <a href="/dashboard" class="nav-link active" id="nav-dashboard">
                    <div class="nav-icon"><i data-lucide="layout-dashboard"></i></div>
                    <span>Dashboard</span>
                    <div class="nav-pip"></div>
                </a>"""
nav_new = """                <a href="/dashboard" class="nav-link active" id="nav-dashboard">
                    <div class="nav-icon"><i data-lucide="layout-dashboard"></i></div>
                    <span>Dashboard</span>
                    <div class="nav-pip"></div>
                </a>
                <a href="#" class="nav-link" id="nav-live">
                    <div class="nav-icon"><i data-lucide="activity"></i></div>
                    <span>Live Market</span>
                </a>"""
text = text.replace(nav_old, nav_new)

# 2. Extract Chart Card
start_idx = text.find('                    <!-- CHART CARD -->')
end_idx = text.find('                <!-- BOTTOM SECTION:')

if start_idx != -1 and end_idx != -1:
    # Go back to grab the closing div of mid-grid just before BOTTOM SECTION
    midgrid_close = text.rfind('</div>', start_idx, end_idx)
    chart_html = text[start_idx:midgrid_close]
    
    # Remove it
    text = text.replace(chart_html, "")
    
    # Insert new view
    view_live = f"""                <!-- Live Market View -->
                <div id="view-live" class="view-panel">
{chart_html}                </div>\n\n"""
    
    view_intel_top = "                <!-- Market Intelligence View -->"
    text = text.replace(view_intel_top, view_live + view_intel_top)
else:
    print("Chart bounds not found")

with open('static/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
