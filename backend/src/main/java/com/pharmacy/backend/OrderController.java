
package com.pharmacy.backend;

import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://localhost:5174"
})
public class OrderController {

    private final OrderRepository orderRepository;
    private final MedicineRepository medicineRepository;

    public OrderController(
            OrderRepository orderRepository,
            MedicineRepository medicineRepository) {
        this.orderRepository = orderRepository;
        this.medicineRepository = medicineRepository;
    }

    @GetMapping
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @GetMapping("/{id}")
    public Order getOrderById(@PathVariable Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Order not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Order createOrder(@RequestBody Order order) {
        validateOrder(order);

        order.setId(null);

        if (order.getOrderDate() == null) {
            order.setOrderDate(LocalDate.now());
        }

        if (order.getStatus() == null || order.getStatus().isBlank()) {
            order.setStatus("Pending");
        }

        validateStatus(order.getStatus());

        if ("Received".equals(order.getStatus())) {
            adjustStock(order.getMedicineId(), order.getQuantity());
        }

        return orderRepository.save(order);
    }

    @PutMapping("/{id}")
    @Transactional
    public Order updateOrder(
            @PathVariable Long id,
            @RequestBody Order updatedOrder) {

        Order existing = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Order not found: " + id));

        validateOrder(updatedOrder);

        String newStatus = updatedOrder.getStatus();

        if (newStatus == null || newStatus.isBlank()) {
            newStatus = "Pending";
        }

        validateStatus(newStatus);

        boolean wasReceived = "Received".equals(existing.getStatus());
        boolean willBeReceived = "Received".equals(newStatus);

        Long oldMedicineId = existing.getMedicineId();
        Long newMedicineId = updatedOrder.getMedicineId();

        int oldQuantity = existing.getQuantity();
        int newQuantity = updatedOrder.getQuantity();

        /*
         * Reverse the previous stock contribution when the old
         * order was Received. Then apply the new contribution
         * if the updated order is Received.
         *
         * The transaction rolls back all changes if an operation fails.
         */
        if (wasReceived) {
            adjustStock(oldMedicineId, -oldQuantity);
        }

        if (willBeReceived) {
            adjustStock(newMedicineId, newQuantity);
        }

        existing.setSupplierId(updatedOrder.getSupplierId());
        existing.setSupplierName(updatedOrder.getSupplierName());
        existing.setMedicineId(newMedicineId);
        existing.setMedicineName(updatedOrder.getMedicineName());
        existing.setQuantity(newQuantity);
        existing.setUnitPrice(updatedOrder.getUnitPrice());
        existing.setOrderDate(
                updatedOrder.getOrderDate() != null
                        ? updatedOrder.getOrderDate()
                        : existing.getOrderDate());
        existing.setStatus(newStatus);

        return orderRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteOrder(@PathVariable Long id) {

        Order existing = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Order not found: " + id));

        if ("Received".equals(existing.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A received order cannot be deleted. Update its status "
                            + "to Cancelled first if the stock is being returned.");
        }

        orderRepository.delete(existing);
    }

    private void validateOrder(Order order) {

        if (order.getSupplierId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Supplier is required.");
        }

        if (order.getMedicineId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Medicine is required.");
        }

        if (order.getQuantity() == null || order.getQuantity() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Order quantity must be greater than zero.");
        }

        if (order.getUnitPrice() == null
                || order.getUnitPrice().signum() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unit price must be zero or greater.");
        }

        if (order.getSupplierName() == null
                || order.getSupplierName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Supplier name is required.");
        }

        if (order.getMedicineName() == null
                || order.getMedicineName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Medicine name is required.");
        }
    }

    private void validateStatus(String status) {
        if (!List.of("Pending", "Received", "Cancelled").contains(status)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status must be Pending, Received or Cancelled.");
        }
    }

    private void adjustStock(Long medicineId, int quantityChange) {

        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Medicine not found: " + medicineId));

        long updatedStock = (long) medicine.getStock() + quantityChange;

        if (updatedStock < 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Stock adjustment would result in negative inventory "
                            + "for medicine: " + medicine.getName());
        }

        if (updatedStock > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Stock quantity exceeds the limit.");
        }

        medicine.setStock((int) updatedStock);
        medicineRepository.save(medicine);
    }
}
