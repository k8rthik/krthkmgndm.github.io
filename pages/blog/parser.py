import os
import json
import markdown
from datetime import datetime

# Paths
posts_dir = '_posts'
json_file = 'posts.json'

# Load existing posts.json or create a new list if it doesn't exist
if os.path.exists(json_file):
    with open(json_file, 'r') as f:
        posts = json.load(f)
else:
    posts = []

# Process each markdown file in the _posts directory
for filename in os.listdir(posts_dir):
    if filename.endswith('.md'):
        # Parse the filename
        date_str = filename[:10]
        title = filename[11:-3]

        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        date_formatted = date_obj.strftime('%B %d, %Y')

        title_formatted = ""
        for i in title.split("-"):
            title_formatted += i.capitalize()+" "

        with open(os.path.join(posts_dir, filename), 'r') as f:
            md_content = f.read()

        # Convert markdown to HTML
        html_content = markdown.markdown(md_content)

        # Create the HTML filename
        html_filename = f"{filename[:-3]}.html"

        # Write the HTML content to the output file
        with open(html_filename, 'w') as f:
            f.write(html_content)

        # Append the post information to the posts list
        post_entry = {
            "file": html_filename,
            "title": title_formatted,
            "date": date_formatted
        }
        posts.append(post_entry)

# Write the updated posts list back to posts.json
with open(json_file, 'w') as f:
    json.dump(posts, f, indent=4)

print("Markdown files have been converted and posts.json has been updated.")
