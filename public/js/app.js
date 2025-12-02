// /images エンドポイントから images.json を取得
fetch("/images")
  .then(response => response.json())
  .then(images => {
    const container = document.querySelector('#images');
    // const container = document.querySelector('#image-wrapper > div');
    console.log(container);
    images.forEach(item => {
      // 画像
      const img = document.createElement("img");
      img.className = "image";
      img.src = "/images/" + item.image;

      // テキスト
      const textDiv = document.createElement("div");
      textDiv.className = "haiku-containers";

      const p = document.createElement("p");
      p.className = "images";
      p.textContent = item.text;

      textDiv.appendChild(p);

      // ページに追加
      container.appendChild(img);
      // container.appendChild(textDiv);
    });
  })
  .catch(err => console.error("Failed to load images:", err));


// document.addEventListener('DOMContentLoaded', () => {
//     const imageWrapper = document.querySelector('.image-wrapper');
//     const prevButton = document.querySelector('.prev');
//     const nextButton = document.querySelector('.next');
    
//     // スクロールする量（画像一つ分の幅 + マージン）を計算
//     const firstImage = document.querySelector('.image-wrapper .image');
//     // 画像が存在し、スタイルが適用されているか確認
//     if (!firstImage) return; 

//     // 画像の幅 (offsetWidth) + 右マージン (例: 10px) の合計
//     const scrollAmount = firstImage.offsetWidth + 20; // 左右マージン合計 20px と仮定 (10px + 10px)

//     // 「次へ」ボタンの処理
//     nextButton.addEventListener('click', () => {
//         // 現在の位置から scrollAmount 分だけ右にスクロール
//         imageWrapper.scrollBy({
//             left: scrollAmount,
//             behavior: 'smooth' // スムーズなアニメーションでスクロール
//         });
//     });

//     // 「前へ」ボタンの処理
//     prevButton.addEventListener('click', () => {
//         // 現在の位置から scrollAmount 分だけ左にスクロール
//         imageWrapper.scrollBy({
//             left: -scrollAmount,
//             behavior: 'smooth' // スムーズなアニメーションでスクロール
//         });
//     });
// });