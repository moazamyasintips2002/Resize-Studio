# Use the lightweight Nginx alpine image
FROM nginx:alpine
# Copy your frontend static files to the Nginx html directory
COPY index.html styles.css app.js tools.js /usr/share/nginx/html/
#Expose port 80
EXPOSE 80
