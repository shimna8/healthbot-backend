# Custom Design Implementation - One Question at a Time

## 📁 File Created: `index-custom-design.html`

This is a **separate test file** that implements your design requirements without touching your original `index.html`.

---

## ✅ What's Implemented

### 1. **One Question at a Time**
- Only the latest question is visible
- Previous questions are hidden automatically
- Clean, focused interface

### 2. **Large Text**
- Question text: **24px** (mobile: 20px)
- Centered and easy to read
- Proper line height for readability

### 3. **Big Buttons**
- Button size: **280px wide × 60px high**
- Font size: **20px**
- Rounded corners (30px radius)
- Hover effects with smooth transitions

### 4. **Hidden Text Input**
- Text input box is completely hidden
- Only buttons are visible for answers
- Clean interface matching your mockup

### 5. **Proper Message Handling**
- Uses Web Chat SDK's built-in message sending
- Ensures correct format for bot responses
- No custom message manipulation (safe for bot validation)

---

## 🎨 CSS Overrides Applied

```css
/* Hide all previous messages - only show latest */
#webchat .webchat__basic-transcript__activity:not(:last-child) {
    display: none !important;
}

/* Hide text input box */
#webchat .webchat__send-box {
    display: none !important;
}

/* Large centered question text */
#webchat .webchat__bubble__content {
    font-size: 24px !important;
    text-align: center !important;
    padding: 60px 40px 40px 40px !important;
}

/* Big buttons */
#webchat .webchat__suggested-action {
    min-width: 280px !important;
    height: 60px !important;
    font-size: 20px !important;
}
```

---

## 🔒 Safe Message Handling

### ✅ What I Did (SAFE):
- Used Web Chat SDK's native button click handling
- Let the SDK format and send messages properly
- No custom message construction
- Bot receives messages in expected format

### ❌ What I Avoided (UNSAFE):
- Manual message construction
- Custom Direct Line API calls for answers
- Modifying message payload structure
- Intercepting or changing button values

---

## 🧪 How to Test

### Step 1: Open the Custom Design
```
http://localhost:3000/index-custom-design.html
```

### Step 2: Start Assessment
1. Click "Start SafeLungs Assessment"
2. Go through welcome screens
3. Click "Move On"

### Step 3: Verify Design
- ✅ Only one question visible at a time
- ✅ Large, centered text
- ✅ Big buttons (Yes/No style)
- ✅ No text input box
- ✅ Clean interface

### Step 4: Test Answers
1. Click a button (e.g., "Yes")
2. Watch the next question appear
3. Previous question should disappear
4. Check browser console for logs:
   ```
   📤 User sent answer: Yes
   📥 Bot received message: [next question]
   ```

---

## 📊 Comparison

### Your Original Design (`index.html`)
- Shows chat history
- Smaller text and buttons
- Text input visible
- Traditional chat interface

### New Custom Design (`index-custom-design.html`)
- ✅ One question at a time
- ✅ Large text (24px)
- ✅ Big buttons (280px × 60px)
- ✅ No text input
- ✅ Matches your mockup

---

## 🎯 Key Features

### 1. **Responsive Design**
- Desktop: 24px text, 280px buttons
- Mobile: 20px text, 240px buttons
- Adapts to screen size

### 2. **Smooth Transitions**
- Questions fade in/out
- Button hover effects
- Professional animations

### 3. **Accessibility**
- High contrast colors
- Large touch targets
- Keyboard navigation support

### 4. **Bot Compatibility**
- Uses standard Web Chat SDK
- No custom message handling
- Bot receives properly formatted messages
- All bot features work (cards, attachments, etc.)

---

## 🔧 Technical Details

### Message Flow
```
User clicks button
    ↓
Web Chat SDK handles click
    ↓
SDK formats message properly
    ↓
Sends to Direct Line
    ↓
Bot receives correct format
    ↓
Bot validates and responds
    ↓
Response displayed
```

### CSS Strategy
- Uses `!important` to override Web Chat defaults
- Targets specific Web Chat classes
- Doesn't break functionality
- Only affects visual appearance

---

## 📝 What's Different from Original

### Files:
- **Original**: `index.html` (unchanged)
- **New**: `index-custom-design.html` (custom design)

### Changes:
1. Added ~100 lines of custom CSS
2. Same JavaScript logic (no changes)
3. Same bot integration (no changes)
4. Only visual styling changed

---

## ⚠️ Important Notes

### ✅ Safe Practices Used:
1. **No message manipulation** - Let SDK handle everything
2. **Standard button clicks** - Uses Web Chat's built-in handlers
3. **CSS-only changes** - No logic modifications
4. **Bot compatibility** - Messages sent in expected format

### 🚫 What to Avoid:
1. Don't manually construct message objects
2. Don't intercept button clicks to send custom messages
3. Don't modify the activity payload
4. Don't bypass Web Chat SDK's message handling

---

## 🐛 Troubleshooting

### Issue: Buttons not working
**Solution**: Check browser console for errors. Ensure Web Chat SDK loaded.

### Issue: Text too small/large
**Solution**: Adjust font-size in CSS (line 230):
```css
font-size: 24px !important; /* Change this value */
```

### Issue: Buttons too small/large
**Solution**: Adjust button size in CSS (line 280):
```css
min-width: 280px !important; /* Change width */
height: 60px !important;     /* Change height */
```

### Issue: Previous questions still showing
**Solution**: Clear browser cache and reload

---

## 🚀 Next Steps

### If Design Looks Good:
1. Test with full questionnaire
2. Verify all question types work
3. Test on mobile devices
4. Replace original `index.html` with this design

### If Adjustments Needed:
1. Modify CSS values (sizes, colors, spacing)
2. Test changes in browser
3. Iterate until perfect

### To Apply to Production:
1. Backup original `index.html`
2. Copy CSS from `index-custom-design.html`
3. Paste into original `index.html` `<style>` section
4. Test thoroughly

---

## 📱 Mobile Optimization

The design is fully responsive:

```css
@media (max-width: 768px) {
    /* Smaller text on mobile */
    font-size: 20px !important;
    
    /* Smaller buttons on mobile */
    min-width: 240px !important;
    height: 55px !important;
}
```

---

## 🎨 Customization Guide

### Change Button Colors:
```css
background: #5ec5b6 !important;        /* Normal */
background: #4db3a4 !important;        /* Hover */
```

### Change Text Color:
```css
color: #1e3a5f !important;
```

### Change Button Size:
```css
min-width: 280px !important;  /* Width */
height: 60px !important;      /* Height */
font-size: 20px !important;   /* Text size */
```

### Change Spacing:
```css
padding: 60px 40px 40px 40px !important;  /* Around question */
gap: 20px !important;                      /* Between buttons */
```

---

## ✅ Testing Checklist

- [ ] Page loads without errors
- [ ] Token generation works
- [ ] Bot connection established
- [ ] First question appears
- [ ] Only one question visible
- [ ] Text is large and centered
- [ ] Buttons are big and clickable
- [ ] Text input is hidden
- [ ] Clicking button sends answer
- [ ] Next question appears
- [ ] Previous question disappears
- [ ] Works on desktop
- [ ] Works on mobile
- [ ] No console errors

---

## 📞 Support

### To Test:
```bash
# Server should be running
npm start

# Open in browser
http://localhost:3000/index-custom-design.html
```

### To Debug:
1. Open browser console (F12)
2. Look for logs:
   - `✓ Direct Line connection established`
   - `📤 User sent answer: [answer]`
   - `📥 Bot received message: [question]`

---

## 🎉 Summary

✅ **Created**: `index-custom-design.html`  
✅ **Design**: One question at a time  
✅ **Text**: Large (24px)  
✅ **Buttons**: Big (280px × 60px)  
✅ **Input**: Hidden  
✅ **Safe**: Uses standard Web Chat SDK  
✅ **Compatible**: Bot receives correct message format  
✅ **Tested**: Token generation working  

**Status**: Ready for testing! 🚀

Open `http://localhost:3000/index-custom-design.html` and try it out!

