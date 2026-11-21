ffmpeg -i entrada.mp4 -vcodec libwebp -filter:v fps=fps=15 -lossless 0 -compression_level 3 -q:v 70 -loop 0 -preset picture -an -vsync 0 saida.webp
