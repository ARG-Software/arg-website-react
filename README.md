# ARG Software - React Conversion

This is a React conversion of the ARG Software website.

## Project Structure

```
├── App.jsx          # Main application component
├── App.css          # Styles (from original Webflow CSS)
├── main.jsx         # React entry point
├── index.html       # HTML template
├── package.json     # Dependencies
└── vite.config.js   # Vite configuration
```

## Components Implemented

### ✅ Completed
- Navigation
- Hero Section
- Partners Section
- About Section
- Infinity Band (scrolling text)
- Services Section
- Footer

### 🚧 To Be Implemented
- Projects Section (with modal functionality)
- Testimonials Section
- Work With Us Section (with counter animations)
- Team Section
- Social Section
- CTA Section (with Typeform)

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Notes

- The original site uses several external libraries (Webflow, Swiper, Lenis, Spline)
- Images and videos need to be placed in a `public/images` folder
- Some animations from the original will need additional implementation
- The modal functionality for projects needs custom React implementation

## Next Steps

1. Create the Projects section with modal functionality
2. Implement Testimonials with animations
3. Add Work With Us section with number counters
4. Create Team section
5. Add Social section with Elfsight integration
6. Implement CTA section with Typeform
7. Add smooth scroll with Lenis
8. Implement Spline 3D animations for Services section
9. Add all animation triggers and scroll effects

## External Dependencies

The app loads these external scripts:
- Swiper.js for carousels
- Lenis for smooth scrolling
- Finsweet attributes for number counters
- Google Analytics
- Cookie consent
- Elfsight for social feed
