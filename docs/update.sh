npm install markdown-to-html -g

echo "<html><head>" \
  "<title>Documentation</title>" \
  "<meta charset=\"UTF-8\">" \
  "<link rel=\"stylesheet\" type=\"text/css\" href=\"/src/css/reset.css\">" \
  "<link rel=\"stylesheet\" type=\"text/css\" href=\"/src/css/ed/docs.css\">" \
  "</head><body>" > index.html
markdown README.md >> index.html
echo "</body></html>" >> index.html
