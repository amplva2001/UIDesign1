document.querySelector('#darkmode').addEventListener('click', function() {
  document.body.classList.toggle('dark');
  this.textContent = document.body.classList.contains('dark') ? 'Light Mode' : 'Dark Mode';
});
