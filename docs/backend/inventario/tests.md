# Tests — Inventario

`Services/InventarioServiceTests.cs`: crear y persistir, nombre duplicado
en crear/actualizar → `ConflictoException`, obtener inexistente →
`NoEncontradoException`, actualizar cambia datos, cambiar estado
desactiva, listar filtra por categoría+activo combinados, descontar stock
(suficiente, insuficiente, ítem inactivo, cantidad cero/negativa — en los
tres casos de error verifica que el stock **no** se alteró), reponer stock
(suma, cantidad cero/negativa falla sin alterar, ítem inexistente →
`NoEncontradoException`).

`Integration/CatalogoEndpointsTests.cs`: solo cubre el happy path de
lectura anónima (`GET /api/inventario` sin token → 200) a nivel HTTP — el
resto de las reglas ya está cubierto por los unitarios.
