<!-- Sir Alex Ferguson Anime Coach Image Instructions -->

To add the Sir Alex Ferguson anime-style coach image:

1. **Get or Create the Image:**
   - Create or find an anime-style image of Sir Alex Ferguson
   - Recommended size: 200x200 pixels (square)
   - Format: PNG or JPG
   - Background: Transparent (PNG) or solid color

2. **Save the Image:**
   - Save the image as "sir-alex-anime.png" in the /public folder
   - Path should be: /public/sir-alex-anime.png

3. **Image Requirements:**
   - Circular crop (the CSS will handle the border-radius)
   - High quality for crisp display
   - Anime/cartoon style to match the theme

4. **Alternative Names:** If you want to use a different filename, update the src in:
   /src/app/coach/page.tsx line ~281

5. **Fallback:** If the image fails to load, it will automatically show the robot emoji (🤖)

**Current Implementation:**
- The image is set to display in a circular container
- Size: 4rem x 4rem (64px x 64px)
- Auto-fallback to emoji if image not found
- Object-fit: cover (maintains aspect ratio)

**Suggested AI Image Prompts:**
"Anime style Sir Alex Ferguson as a sports coach, circular portrait, friendly expression, coaching attire, cartoon/manga art style"