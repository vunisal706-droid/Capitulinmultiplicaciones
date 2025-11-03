# 🚀 Guía Rápida: Subir a GitHub Pages

## Pasos para publicar tu juego en internet (GRATIS)

### 1️⃣ Crear cuenta en GitHub (si no tienes)
- Ve a https://github.com
- Haz clic en "Sign up"
- Crea tu cuenta gratuita

### 2️⃣ Crear un nuevo repositorio
1. Haz clic en el botón "+" arriba a la derecha
2. Selecciona "New repository"
3. Nombre: `capitulin-matematico` (o el que quieras)
4. Marca "Public"
5. Haz clic en "Create repository"

### 3️⃣ Subir los archivos
**Opción A - Arrastrar y soltar (más fácil):**
1. En la página del repositorio nuevo, haz clic en "uploading an existing file"
2. Arrastra TODOS estos archivos:
   ```
   inicio.html
   index.html
   multiplicaciones.html
   manifest.json
   manifest-sumas.json
   sw.js
   sw-sumas.js
   README.md
   ```
3. Escribe un mensaje: "Primera versión"
4. Haz clic en "Commit changes"

**Opción B - Si sabes usar Git:**
```bash
git init
git add .
git commit -m "Primera versión"
git remote add origin https://github.com/TUUSUARIO/capitulin-matematico.git
git push -u origin main
```

### 4️⃣ Activar GitHub Pages
1. Ve a tu repositorio en GitHub
2. Haz clic en "Settings" (arriba)
3. En el menú izquierdo, busca "Pages"
4. En "Source", selecciona "Deploy from a branch"
5. En "Branch", selecciona "main" y "/root"
6. Haz clic en "Save"
7. **Espera 1-2 minutos**

### 5️⃣ ¡Listo! Tu URL será:
```
https://TUUSUARIO.github.io/capitulin-matematico/inicio.html
```

Reemplaza `TUUSUARIO` con tu nombre de usuario de GitHub.

### 6️⃣ Compartir con estudiantes
- Copia la URL completa
- Compártela por correo, classroom, etc.
- Los estudiantes pueden:
  - Jugar directamente en el navegador
  - Instalar como app (botón "📱 Instalar App")
  - Usar sin internet después de instalar

---

## ❓ Solución de problemas

### "No encuentro mi juego"
- La URL debe terminar en `/inicio.html`
- Ejemplo correcto: `https://tuusuario.github.io/repo/inicio.html`

### "Error 404"
- Espera 2-3 minutos después de activar GitHub Pages
- Verifica que subiste todos los archivos
- Asegúrate de que el archivo se llama exactamente `inicio.html`

### "No aparece el botón instalar"
- Solo aparece en Chrome/Edge
- La página debe estar en HTTPS (GitHub Pages lo hace automático)
- Si ya lo instalaste antes, no aparece de nuevo

---

## 🔄 Para actualizar el juego

1. Ve a tu repositorio en GitHub
2. Haz clic en el archivo que quieras editar
3. Haz clic en el ícono del lápiz (editar)
4. Haz los cambios
5. Scroll abajo y haz clic en "Commit changes"
6. Espera 1-2 minutos para que se actualice

---

## 💡 Consejos

- **Gratis forever:** GitHub Pages es gratis para siempre
- **Sin límites:** Puedes tener múltiples repositorios
- **Fácil compartir:** Solo compartes un enlace
- **Siempre disponible:** Funciona 24/7

**¡Listo para compartir con tus estudiantes!** 🎓✨
