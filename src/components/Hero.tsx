export function Hero({onNewDesign}: {onNewDesign: () => void}) {
  return (
    <div className="hero">
      <h1>Thiết kế mặt bằng nhà ở 2D trên trình duyệt</h1>
      <p>Nhập đất, số tầng, nhu cầu phòng; app sinh nhiều phương án, chấm điểm, cảnh báo ràng buộc và cho phép chỉnh sửa/xuất file.</p>
      <button onClick={onNewDesign}>Tạo thiết kế mới</button>
    </div>
  );
}
