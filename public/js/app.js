// /haikus エンドポイントから haikus.json を取得
fetch("/haikus")
  .then(response => response.json())
  .then(haikus => {
    const container = document.getElementById("haiku-container");

    haikus.forEach(item => {
      // 画像
      const img = document.createElement("img");
      img.className = "mona-images";
      img.src = "/images/" + item.image;

      // テキスト
      const textDiv = document.createElement("div");
      textDiv.className = "haiku-containers";

      const p = document.createElement("p");
      p.className = "haikus";
      p.textContent = item.text;

      textDiv.appendChild(p);

      // ページに追加
      container.appendChild(img);
      container.appendChild(textDiv);
    });
  })
  .catch(err => console.error("Failed to load haikus:", err));
