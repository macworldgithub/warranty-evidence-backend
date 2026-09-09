const fs = require('fs');

const css = `@import "tailwindcss";

:root {
  --color-midnight: #081225;
  --color-deep-navy: #0d1b3e;
  --color-navy-600: #132952;
  --color-electric: #1a56db;
  --color-cyan-glow: #00f0ff;
  --color-gold: #f59e0b;
  --color-silver: #cbd5e1;
  --color-success: #10b981;
  --color-danger: #ef4444;
}

body {
  background-color: #081225;
  color: #cbd5e1;
  font-family: var(--font-inter), system-ui, sans-serif;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* Glass Card */
.glass-card {
  background: linear-gradient(135deg, rgba(13, 27, 62, 0.85) 0%, rgba(13, 27, 62, 0.65) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(26, 86, 219, 0.2);
  border-radius: 1rem;
  transition: all 0.2s ease-in-out;
}

.glass-card:hover {
  border-color: rgba(0, 240, 255, 0.4);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
  transform: translateY(-1px);
}

.glass-card-static {
  background: linear-gradient(135deg, rgba(13, 27, 62, 0.85) 0%, rgba(13, 27, 62, 0.65) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(26, 86, 219, 0.2);
  border-radius: 1rem;
}

/* Buttons */
.btn-primary {
  background: linear-gradient(135deg, #1a56db 0%, #2563eb 100%);
  color: #ffffff;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  box-shadow: 0 0 20px rgba(26, 86, 219, 0.5);
  transform: translateY(-1px);
}

.btn-ghost {
  background: transparent;
  color: #cbd5e1;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(26, 86, 219, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-ghost:hover {
  border-color: #1a56db;
  color: #ffffff;
  background: rgba(26, 86, 219, 0.15);
}

.btn-danger {
  background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
  color: #ffffff;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-danger:hover {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: #ffffff;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-success:hover {
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
}

/* Form Inputs */
.input-field {
  width: 100%;
  background: rgba(8, 18, 37, 0.75);
  border: 1px solid rgba(26, 86, 219, 0.25);
  border-radius: 0.75rem;
  padding: 0.625rem 0.875rem;
  color: #ffffff;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  outline: none;
}

.input-field:focus {
  border-color: #1a56db;
  box-shadow: 0 0 0 2px rgba(26, 86, 219, 0.2);
}

.input-field::placeholder {
  color: #64748b;
}

select.input-field {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23cbd5e1' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

.animate-scaleIn {
  animation: scaleIn 0.2s ease-out forwards;
}

.animate-slideInLeft {
  animation: slideInLeft 0.3s ease-out forwards;
}

.animate-slideInRight {
  animation: slideInRight 0.3s ease-out forwards;
}

/* Toast */
.toast-container {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  backdrop-filter: blur(12px);
  min-width: 280px;
  animation: slideInRight 0.25s ease-out forwards;
}

.toast-success {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.toast-error {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.toast-info {
  background: rgba(26, 86, 219, 0.2);
  border: 1px solid rgba(26, 86, 219, 0.4);
}

/* Starfield pattern */
.starfield {
  background-image: 
    radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.4), rgba(0,0,0,0)),
    radial-gradient(1px 1px at 100px 150px, rgba(255,255,255,0.3), rgba(0,0,0,0)),
    radial-gradient(1.5px 1.5px at 250px 80px, rgba(0,240,255,0.5), rgba(0,0,0,0)),
    radial-gradient(1px 1px at 400px 220px, rgba(255,255,255,0.3), rgba(0,0,0,0)),
    radial-gradient(1.5px 1.5px at 550px 60px, rgba(26,86,219,0.5), rgba(0,0,0,0)),
    radial-gradient(1px 1px at 700px 180px, rgba(255,255,255,0.4), rgba(0,0,0,0)),
    radial-gradient(1.5px 1.5px at 850px 120px, rgba(0,240,255,0.4), rgba(0,0,0,0));
  background-repeat: repeat;
  background-size: 900px 300px;
}
`;

fs.writeFileSync('d:/booran-warranty-new/app/globals.css', css.trim() + '\n', 'utf8');
console.log('Fixed globals.css');
