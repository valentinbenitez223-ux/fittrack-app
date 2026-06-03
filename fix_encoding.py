import sys

try:
    with open('app.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Try to reverse the double encoding
    # PowerShell read UTF-8 as CP1252, then saved it as UTF-8.
    try:
        fixed_content = content.encode('cp1252').decode('utf-8')
    except Exception as e:
        # Fallback if there are unmappable characters
        fixed_content = content.encode('cp1252', errors='ignore').decode('utf-8', errors='ignore')

    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    print("Fixed app.js encoding successfully.")

except Exception as e:
    print(f"Error: {e}")
