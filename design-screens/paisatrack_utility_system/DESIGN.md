---
name: RupeeSafe Utility System
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#3e4946'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#6e7976'
  outline-variant: '#bec9c5'
  surface-tint: '#046b5e'
  primary: '#004f45'
  on-primary: '#ffffff'
  primary-container: '#00695c'
  on-primary-container: '#94e5d5'
  inverse-primary: '#84d5c5'
  secondary: '#5d5f5e'
  on-secondary: '#ffffff'
  secondary-container: '#dcdddc'
  on-secondary-container: '#5f6161'
  tertiary: '#703321'
  on-tertiary: '#ffffff'
  tertiary-container: '#8d4a36'
  on-tertiary-container: '#ffcabb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a0f2e1'
  primary-fixed-dim: '#84d5c5'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005046'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c7c6'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb59f'
  on-tertiary-fixed: '#3a0b01'
  on-tertiary-fixed-variant: '#723522'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  currency-display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 20px
  gutter: 12px
---

## Brand & Style

This design system is built on the principles of **Minimalism** and **Modern Corporate** design, specifically tailored for the Indian financial context. It moves away from the aggressive, high-energy "neon fintech" trend, instead opting for a "Financial Zen" approach. The aesthetic evokes a sense of calm and order, which is essential for users managing their personal expenses.

The brand personality is **Practical and Trustworthy**. It prioritizes utility over decoration, ensuring that the interface feels like a lightweight tool rather than a cluttered dashboard. By using a warm neutral palette, the design system avoids the coldness of purely clinical interfaces, making the experience feel personal and safe—a critical factor for a privacy-first product.

## Colors

The palette is anchored by a **Deep Emerald-Teal**, a color that symbolizes both growth and institutional stability. This primary accent is used sparingly for key actions and focus states to prevent visual fatigue.

The background uses a sophisticated mix of **Soft Warm Neutrals** and **Very Light Greys**. This distinction is functional: off-white surfaces distinguish cards and interactive modules from the base background. Text hierarchy is strictly enforced through color, with Dark Charcoal used for primary data and Muted Grey for metadata and inactive labels, ensuring a high level of legibility even in outdoor lighting conditions.

## Typography

The design system utilizes **Inter** for its systematic and utilitarian qualities. To handle the complexity of financial data, the most critical typographic rule is the application of **Tabular Numbers (`tnum`)** for all currency values. This ensures that decimal points and digits align vertically in lists, allowing users to scan and compare expenses instantly.

Hierarchy is created through scale rather than weight alone. Large, bold headings are reserved for high-level summaries (e.g., Total Spend), while metadata and secondary details use compact, slightly tracked-out labels for maximum space efficiency on mobile screens.

## Layout & Spacing

The layout follows a **fluid grid** model optimized for one-handed mobile usage. A standard 4-column grid is used for mobile devices, with interactive elements positioned primarily in the lower two-thirds of the screen (the "Thumb Zone").

The spacing rhythm is based on an **8px base unit**, ensuring consistent alignment across all components. High-density views (like transaction lists) utilize tighter vertical spacing (`sm`), while summary dashboards use more generous margins (`lg` or `xl`) to create a premium, breathable feel.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. Instead of heavy shadows, this design system uses "low-altitude" elevations to maintain a clean aesthetic.

- **Base Level:** The page background in a very light grey or off-white.
- **Surface Level:** White cards used for content groups, featuring a 1px soft stroke or a very diffused shadow (0px 4px 20px rgba(0, 0, 0, 0.04)).
- **Active Level:** Floating Action Buttons (FABs) or active modals use a slightly more pronounced shadow to indicate they are "above" the layout.

Visual depth is used to guide the user's eye toward the most recent or relevant financial data without overwhelming the visual field.

## Shapes

The shape language is **Rounded (Level 2)**, striking a balance between the precision of a utility tool and the approachability of a personal assistant.

Standard buttons and input fields use a **0.5rem (8px)** radius. Larger containers, such as spending summary cards, use **1rem (16px)** to create a softer, more modern framing effect. Secondary elements like category chips or "Save" buttons may use **pill-shapes** to distinguish them from structural layout elements.

## Components

### Buttons
- **Primary:** Solid Emerald-Teal (#00695C) with white text. High-contrast, used for the main "Add Expense" or "Save" actions.
- **Secondary:** Ghost style with a Primary-colored border or a light Emerald-Teal tint background.
- **Action Icons:** Simple outline icons with a 24x24px hit area minimum.

### Input Fields
- **Financial Inputs:** Large, center-aligned text for currency entry with a fixed Rupee symbol (₹).
- **Standard Inputs:** Outlined with a subtle 1px grey border that transitions to Emerald-Teal on focus.

### Cards & Lists
- **Transaction Item:** A clean list item with a leading category icon (housed in a soft-colored circle), primary label, and right-aligned tabular currency value.
- **Summary Cards:** White surfaces with soft shadows and internal padding of 16px or 24px.

### Feedback Elements
- **Budget Alerts:** Soft Amber background with dark amber text. Minimalist, using an "alert" icon but avoiding "alarmist" visual language.
- **Success Toasts:** Emerald Green background, appearing briefly at the bottom of the screen to confirm a transaction entry.

### Interaction
All touch targets for navigation and common actions must be at least 48dp in height to ensure ease of use during one-handed operation on mobile devices.