// Загружаем JSON и создаём дерево
fetch("data.json")
  .then((response) => response.json())
  .then((data) => {
    const convertedData = convertData(data);
    renderTree(convertedData); // Отрисовываем дерево
  });

/**
 * Конвертация данных: Формирует структуру дерева, включая супругов и их детей
 */
function convertData(person) {
  let node = {
    name: person.name,
    description: person.description,
    photo: person.photo || "assets/default.jpg", // Устанавливаем дефолтное фото, если отсутствует
    birth: person.birth, // Дата рождения
    death: person.death, // Дата смерти
    children: [],
  };

  // Добавляем собственных детей
  if (person.children && person.children.length > 0) {
    person.children.forEach((child) => {
      node.children.push(convertData(child));
    });
  }

  // Если spouse указан, добавляем детей супруга в дерево и соединяем их с супругом
  if (person.spouse) {
    if (Array.isArray(person.spouse)) {
      // Если несколько супругов
      person.spouse.forEach((spouse) => {
        if (!spouse.name) {
          if (spouse.children && spouse.children.length > 0) {
            spouse.children.forEach((child) => {
              node.children.push(convertData(child));
            });
          }
        } else {
          let spouseNode = {
            name: spouse.name, // Просто имя, без дат
            description: spouse.description,
            photo: spouse.photo || "assets/default.jpg", // Устанавливаем дефолтное фото, если отсутствует
            birth: spouse.birth, // Дата рождения
            death: spouse.death, // Дата смерти
            isSpouse: true, // Супруга помечаем флагом
            children: [],
          };

          // Добавляем детей супруга под его узел
          if (spouse.children && spouse.children.length > 0) {
            spouse.children.forEach((child) => {
              spouseNode.children.push(convertData(child));
            });
          }

          node.children.push(spouseNode); // Добавляем узел супруга
        }
      });
    } else {
      // Если у человека один супруг
      if (!person.spouse.name) {
        if (person.spouse.children && person.spouse.children.length > 0) {
          person.spouse.children.forEach((child) => {
            node.children.push(convertData(child));
          });
        }
      } else {
        let spouseNode = {
          name: person.spouse.name, // Просто имя, без дат
          description: person.spouse.description,
          photo: person.spouse.photo || "assets/default.jpg", // Устанавливаем дефолтное фото, если отсутствует
          birth: person.spouse.birth, // Дата рождения
          death: person.spouse.death, // Дата смерти
          isSpouse: true,
          children: [],
        };

        if (person.spouse.children && person.spouse.children.length > 0) {
          person.spouse.children.forEach((child) => {
            spouseNode.children.push(convertData(child));
          });
        }

        node.children.push(spouseNode); // Добавляем супруга как ноду
      }
    }
  }

  return node;
}

/**
 * Форматируем даты (рождения и смерти) для отображения рядом с именем
 */
function formatLifespan(person) {
  if (!person.birth && !person.death) {
    return ""; // Если ни одна дата не указана
  }

  if (person.birth && person.death) {
    return ` (${person.birth}-${person.death})`;
  } else if (person.birth) {
    return ` (${person.birth}-)`;
  } else {
    return ` (-${person.death})`;
  }
}

/**
 * Генерация дерева с использованием D3.js
 */
function renderTree(data) {
  const width = 3000; // Ширина дерева
  const height = 5500; // Высота дерева
  const yScale = 1.2; // Масштабирование горизонта
  const xScale = 1.2; // Масштабирование вертикали

  const svg = d3
    .select("#tree") // SVG-контейнер
    .attr("width", width)
    .attr("height", height)
    .call(
      d3
        .zoom()
        .scaleExtent([0.5, 2]) // Масштабирование от 0.5x до 2x
        .on("zoom", (event) => {
          g.attr("transform", event.transform); // Перемещение дерева
        })
    )
    .on("dblclick.zoom", null); // Отключаем двойной клик для зума

  const g = svg.append("g");

  const root = d3.hierarchy(data, (d) => d.children);

  d3.tree().size([height, width / xScale])(root); // Масштабирование по ширине

  const links = root.links();
  const nodes = root.descendants();

  let firstNode = nodes[0]; // Первая нода (корень)

  // Линии между узлами
  g.selectAll("path")
    .data(links)
    .join("path")
    .attr("d", (d) => {
      return `
        M${d.source.y * yScale},${d.source.x * xScale}
        C${((d.source.y + d.target.y) / 2) * yScale},${d.source.x * xScale}
         ${((d.source.y + d.target.y) / 2) * yScale},${d.target.x * xScale}
         ${d.target.y * yScale},${d.target.x * xScale}
      `;
    })
    .attr("fill", "none")
    .attr("stroke", "#ccc"); // Цвет линий

  // Узлы дерева
  const gNodes = g
    .selectAll("g.node")
    .data(nodes)
    .join("g")
    .attr("transform", (d) => `translate(${d.y * yScale},${d.x * xScale})`) // Применяем масштабирование к координатам `y`
    .attr("class", "node")
    .on("click", (event, d) => updateInfoPanel(d.data)); // Логика клика

  // Круг узла
  gNodes
    .append("circle")
    .attr("r", 10)
    .attr("fill", (d) => {
      if (d.data.isSpouse) {
        return d.data.photo && d.data.photo !== "assets/default.jpg"
          ? "#606b6b" // Темно-серый с голубым оттенком для супругов с фото
          : "#cccccc"; // Светло-серый для супругов без фото
      } else {
        return d.data.photo && d.data.photo !== "assets/default.jpg"
          ? "#00bfff" // Голубой для узлов с фото
          : "#b3e6b3"; // Светло-зеленый для узлов без фото
      }
    })
    .attr("stroke", "#555")
    .attr("stroke-width", 2);

  // Текст узлов
  gNodes
    .append("text")
    .attr("dy", (d) => (d.data.isSpouse ? 20 : -20)) // Текст под кругом для супругов, над кругом для остальных
    .attr("text-anchor", "middle")
    .text(
      (d) => `${d.data.name || "Без имени"}${formatLifespan(d.data)}` // Добавляем формат дат рядом с именем
    );

  // Центрируем дерево по первой ноде
  centerTree(firstNode, svg, g);
}

/**
 * Центрирование дерева по первой ноде
 */
function centerTree(node, svg, g) {
  const svgWidth = parseInt(svg.attr("width"));
  const svgHeight = parseInt(svg.attr("height"));
  const scale = 1; // Стартовый масштаб

  // Вычисляем координаты центра
  const translateX = svgWidth / 2 - node.y;
  const translateY = svgHeight / 2 - node.x;

  // Применение трансформации
  svg
    .transition()
    .duration(500)
    .call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(translateX - 2000, translateY - 1000).scale(scale)
    );
}

/**
 * Отображение информации о выбранной ноде
 */
function updateInfoPanel(data) {
  const nameEl = document.getElementById("info-name");
  const photoEl = document.getElementById("info-photo");
  const descriptionEl = document.getElementById("info-description");

  // Обновляем имя
  nameEl.textContent = `${data.name || "Без имени"}${formatLifespan(data)}`;

  // Обновляем фото
  photoEl.src = data.photo || "assets/default.jpg";

  // Определяем описание, даты рождения и смерти
  let details = "";

  if (data.birth) {
    details += `<p><strong>Дата рождения:</strong> ${data.birth}</p>`;
  }

  if (data.death) {
    details += `<p><strong>Дата смерти:</strong> ${data.death}</p>`;
  }

  if (data.description) {
    details += `<p><strong>Описание:</strong> ${data.description}</p>`;
  }

  // Если ни одно поле не присутствует, предоставляем текст по умолчанию
  descriptionEl.innerHTML = details || "<p>Информация отсутствует</p>";
}
