// 发现有时会和当前页面重复，加一个判断
function randomPost() {
	fetch("/baidusitemap.xml")
		.then((res) => res.text())
		.then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
		.then((data) => {
			let ls = data.querySelectorAll("url loc");
			// 将ls中所有的链接的开头换为https://hexo.gcnanmu3125.xyz/
			const newUrl = "https://hexo.gcnanmu3125.top/";

			// 读取当前的url

			console.log(location.href);

			for (let i = 0; i < ls.length; i++) {
				let str = ls[i].innerHTML;
				const urlSplit = str.split("/");
				// console.log(urlSplit); // [ 'https:', '', 'ldm0715.github.io', 'post', 'javascript-mo-kuai-hua-kuai-su;

				// console.log(urlSplit.slice(3, -1)); // [ 'https:', '', 'ldm0715.github.io', 'post', 'javascript-mo-kuai-hua-kuai-su-ru

				let url = newUrl + urlSplit.slice(3, -1).join("/");
				// console.log(url); // https://hexo.gcnanmu3125.xyz/ldm0715.github.io/post/javascript-mo-kuai-hua-kuai-su
				ls[i].innerHTML = url;
			}

			while (true) {
				let url = ls[Math.floor(Math.random() * ls.length)].innerHTML;
				if (location.href == url) continue;
				location.href = url;
				return;
			}
		});
}
// 阅读文章时看了一遍写的代码，发现加个数组和一个遍历完全没必要，改成下面这个即可。
// function randomPost() {
//     fetch('/baidusitemap.xml').then(res => res.text()).then(str => (new window.DOMParser()).parseFromString(str, "text/xml")).then(data => {
//         let ls = data.querySelectorAll('url loc');
//         location.href = ls[Math.floor(Math.random() * ls.length)].innerHTML
//     })
// }
// 旧代码
// function randomPost() {
// fetch('/baidusitemap.xml').then(res => res.text()).then(str => (new window.DOMParser()).parseFromString(str, "text/xml")).then(data => {
//     let ls = data.querySelectorAll('url loc');
//     let list = [];
//     ls.forEach(i => list.push(i.innerHTML))
//     location.href = list[Math.floor(Math.random() * ls.length)]
// })
// }
