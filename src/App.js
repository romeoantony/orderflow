import React, { useState, useEffect, useCallback } from "react";

// Main App component
const App = () => {
    // --- App State Variables ---
    const [syncMessage, setSyncMessage] = useState(""); // For sync feedback message
    const [isSyncSuccess, setIsSyncSuccess] = useState(false); // To style sync message
    const [showMenuEditor, setShowMenuEditor] = useState(false); // State to control menu editor visibility
    const [showConfirmModal, setShowConfirmModal] = useState(false); // State to control custom confirm modal
    const [confirmModalAction, setConfirmModalAction] = useState(null); // Function to call if confirmed
    const [confirmModalMessage, setConfirmModalMessage] = useState(""); // Message for the confirm modal
    const [appLoading, setAppLoading] = useState(false); // No Firebase, so no app loading delay here

    // Tax rate (now in-memory)
    const [taxRate, setTaxRate] = useState(0.08); // Example initial tax rate (8%)

    // Menu items (now in-memory)
    const [menuItems, setMenuItems] = useState([
        { id: 1, name: "Garlic Bread", price: 10.5 },
        { id: 2, name: "Caesar Salad", price: 12.0 },
        { id: 3, name: "Spaghetti Bolognese", price: 18.75 },
        { id: 4, name: "Margherita Pizza", price: 16.0 },
        { id: 5, name: "Chicken Parmesan", price: 22.5 },
        { id: 6, name: "Soda", price: 3.0 },
        { id: 7, name: "Iced Tea", price: 3.5 },
        { id: 8, name: "Cheesecake", price: 8.0 },
        { id: 9, name: "Espresso", price: 4.0 },
        { id: 10, name: "Steak Frites", price: 29.99 },
        { id: 11, name: "Salmon with Asparagus", price: 26.5 },
        { id: 12, name: "Vegan Burger", price: 17.5 },
    ]);

    // State for all tables, each table holds its own data including items (now in-memory)
    const [tables, setTables] = useState(() => {
        // Helper to format date for initial load in YYYY-MM-DD format for date input
        const getFormattedDate = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`; // YYYY-MM-DD format
        };

        return [
            {
                id: "table-1",
                tableNumber: "1",
                customerName: "Customer A",
                serverName: "Server A",
                date: getFormattedDate(),
                items: [
                    {
                        id: 0,
                        quantity: "1",
                        item: "Garlic Bread",
                        price: "10.50",
                    },
                ],
                tipPercentage: "15",
                isPaid: false,
            },
        ];
    });

    // The ID of the currently displayed table
    const [selectedTableId, setSelectedTableId] = useState(tables[0].id);

    // Derived state for the currently active table object
    const currentTable = tables.find((t) => t.id === selectedTableId);

    // --- Effects ---
    useEffect(() => {
        // Set date for newly added tables if it's somehow missing for the current table
        // Ensure date is in YYYY-MM-DD format
        if (currentTable && !currentTable.date) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            const newDate = `${year}-${month}-${day}`;

            setTables((prevTables) =>
                prevTables.map((t) =>
                    t.id === selectedTableId ? { ...t, date: newDate } : t
                )
            );
        }
        // If no table is selected or the selected table was deleted, select the first one
        if (
            tables.length > 0 &&
            (!selectedTableId || !tables.some((t) => t.id === selectedTableId))
        ) {
            setSelectedTableId(tables[0].id);
        } else if (tables.length === 0) {
            // If no tables exist, automatically create a new one
            handleAddNewTable();
        }
    }, [selectedTableId, currentTable, tables]); // Depend on selectedTableId, currentTable, and tables

    // --- Calculations ---
    const calculateTotalSpent = useCallback(() => {
        return (
            currentTable?.items.reduce((sum, item) => {
                const qty = parseFloat(item.quantity || "0");
                const price = parseFloat(item.price || "0");
                return sum + qty * price;
            }, 0) || 0
        );
    }, [currentTable?.items]);

    const totalSpent = calculateTotalSpent();
    const tipPercentageValue =
        parseFloat(currentTable?.tipPercentage || "0") / 100;
    const tipAmount = totalSpent * tipPercentageValue;
    const taxAmount = totalSpent * taxRate; // Use taxRate from state
    const totalWithTipAndTax = totalSpent + taxAmount + tipAmount;

    // --- Event Handlers ---

    // Updates a property of the currently selected table (e.g., tableNumber, customerName, tipPercentage, serverName, date, isPaid)
    const handleTablePropertyChange = (field, value) => {
        setTables((prevTables) =>
            prevTables.map((table) =>
                table.id === selectedTableId
                    ? { ...table, [field]: value }
                    : table
            )
        );
    };

    // Adds a new blank item row to the current table's order
    const handleAddItem = () => {
        if (!currentTable) return; // Should not happen if a table is always selected
        if (currentTable.isPaid) {
            // Block if table is paid
            showMessage("Cannot add items: Table is marked as PAID.", false);
            return;
        }

        const newId =
            currentTable.items.length > 0
                ? Math.max(...currentTable.items.map((item) => item.id)) + 1
                : 0;

        // Add a blank item by default, allowing server to select from menu or type custom
        handleTablePropertyChange("items", [
            ...currentTable.items,
            { id: newId, quantity: "1", item: "", price: "" },
        ]);
    };

    // Handles changes for quantity or when selecting from the menu dropdown/typing
    const handleItemChange = (itemId, field, value) => {
        if (!currentTable) return;
        if (currentTable.isPaid) {
            // Block if table is paid
            showMessage("Cannot edit items: Table is marked as PAID.", false);
            return;
        }

        const updatedItems = currentTable.items.map((item) => {
            if (item.id === itemId) {
                if (field === "item") {
                    const selectedMenuItem = menuItems.find(
                        (menuItem) => menuItem.name === value
                    );
                    if (selectedMenuItem) {
                        // If a predefined menu item is selected/typed and matches, set its price
                        return {
                            ...item,
                            item: value,
                            price: selectedMenuItem.price.toFixed(2),
                        };
                    } else {
                        // If no menu item matches (custom typing), allow manual input for item name and clear price
                        return {
                            ...item,
                            item: value,
                            price: "", // Clear price for custom entry
                        };
                    }
                }
                return { ...item, [field]: value }; // For quantity or custom price input
            }
            return item;
        });
        handleTablePropertyChange("items", updatedItems);
    };

    // Deletes an item from the current table's order
    const handleDeleteItem = (itemId) => {
        if (!currentTable) return;
        if (currentTable.isPaid) {
            // Block if table is paid
            showMessage("Cannot delete items: Table is marked as PAID.", false);
            return;
        }

        const updatedItems = currentTable.items.filter(
            (item) => item.id !== itemId
        );
        handleTablePropertyChange("items", updatedItems);
    };

    // Displays a temporary message to the user
    const showMessage = (message, success) => {
        setSyncMessage(message);
        setIsSyncSuccess(success);
        setTimeout(() => {
            setSyncMessage("");
            setIsSyncSuccess(false);
        }, 3000); // Message disappears after 3 seconds
    };

    // Simulates the manual data synchronization process (now just a dummy function)
    const handleSyncData = async () => {
        showMessage("Saving orders (in-memory only)...", true); // Indicate sync in progress

        // Simulate network delay and response for demo purposes
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate 1-second delay
        const success = Math.random() > 0.1; // 90% chance of success for demo

        if (success) {
            showMessage(
                "Sync complete! All tables data updated in-memory.",
                true
            );
            return true; // Indicate success for chaining
        } else {
            showMessage("Sync failed. Please try again.", false);
            return false; // Indicate failure
        }
    };

    // Handles changing the currently selected table
    const handleChangeTable = (tableId) => {
        setSelectedTableId(tableId);
    };

    // Handles adding a new table
    const handleAddNewTable = () => {
        const newTableNumber = (
            tables.length > 0
                ? Math.max(...tables.map((t) => parseInt(t.tableNumber))) + 1
                : 1
        ).toString();
        const newTableId = `table-${newTableNumber}-${Date.now()}`; // More robust ID with table number

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const newDate = `${year}-${month}-${day}`; // YYYY-MM-DD format

        const newTable = {
            id: newTableId,
            tableNumber: newTableNumber,
            customerName: "",
            serverName: "", // Default empty for new server name
            date: newDate,
            items: [], // New tables start with an empty order list
            tipPercentage: "15", // Default tip percentage for new tables
            isPaid: false, // Default to not paid
        };
        setTables((prevTables) => [...prevTables, newTable]);
        setSelectedTableId(newTableId); // Automatically switch to the newly created table
    };

    // Handles deleting the currently selected table
    const handleDeleteTable = () => {
        if (!currentTable) {
            showMessage("No table selected to delete.", false);
            return;
        }

        // Show custom confirmation modal
        setConfirmModalMessage(
            `Are you sure you want to delete Table ${currentTable.tableNumber} and all its orders?`
        );
        setConfirmModalAction(() => () => {
            const updatedTables = tables.filter(
                (table) => table.id !== selectedTableId
            );
            setTables(updatedTables);
            if (updatedTables.length > 0) {
                setSelectedTableId(updatedTables[0].id); // Select the first remaining table
            } else {
                // If no tables left, create a new default table
                handleAddNewTable(); // This function already adds a new table and sets selectedTableId
            }
            showMessage(`Table ${currentTable.tableNumber} deleted.`, true);
            setShowConfirmModal(false); // Close modal after action
        });
        setShowConfirmModal(true);
    };

    // --- Mark as Paid/Unpaid ---
    const handleMarkAsPaid = () => {
        if (!currentTable) return;

        const newIsPaidStatus = !currentTable.isPaid; // Toggle status
        setConfirmModalMessage(
            newIsPaidStatus
                ? `Mark Table ${currentTable.tableNumber} as PAID? This will lock the order for changes.`
                : `Mark Table ${currentTable.tableNumber} as UNPAID? This will unlock the order for changes.`
        );
        setConfirmModalAction(() => () => {
            handleTablePropertyChange("isPaid", newIsPaidStatus);
            showMessage(
                newIsPaidStatus
                    ? `Table ${currentTable.tableNumber} marked as PAID.`
                    : `Table ${currentTable.tableNumber} marked as UNPAID.`,
                true
            );
            setShowConfirmModal(false);
        });
        setShowConfirmModal(true);
    };

    // --- Print Bill ---
    const handlePrintBill = async () => {
        // Made async to await sync
        if (!currentTable) {
            showMessage("No table selected to print bill.", false);
            return;
        }

        // First, sync the data to ensure the latest information is printed
        const syncSuccessful = await handleSyncData();
        if (!syncSuccessful) {
            // If sync failed, do not proceed with printing
            return;
        }

        // Generate HTML content for the bill
        let billContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill for Table ${currentTable.tableNumber}</title>
        <style>
          body { font-family: 'Inter', sans-serif; margin: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; border-radius: 8px; }
          h1, h2, h3 { text-align: center; color: #333; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .info-grid div { padding: 5px 0; }
          .info-grid label { font-weight: bold; margin-right: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #eee; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; text-align: center; }
          td:nth-child(1) { text-align: center; } /* Quantity */
          td:nth-child(3), td:nth-child(4) { text-align: right; } /* Price & Total */
          .summary-row { font-weight: bold; }
          .summary-total { font-size: 1.2em; color: #0056b3; }
          .paid-stamp {
            font-size: 3em;
            font-weight: bold;
            color: #28a745;
            border: 4px solid #28a745;
            padding: 10px 20px;
            border-radius: 10px;
            transform: rotate(-15deg);
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            opacity: 0.6;
          }
        </style>
      </head>
      <body>
        <div class="container" style="position: relative;">
          <h1>Restaurant Bill</h1>
          ${currentTable.isPaid ? '<div class="paid-stamp">PAID</div>' : ""}
          <div class="info-grid">
            <div><label>Table No:</label> ${currentTable.tableNumber}</div>
            <div><label>Server:</label> ${currentTable.serverName}</div>
            <div><label>Customer:</label> ${currentTable.customerName}</div>
            <div><label>Date:</label> ${currentTable.date}</div>
          </div>

          <h2>Order Details</h2>
          <table>
            <thead>
              <tr>
                <th style="width:15%;">Qnty</th>
                <th style="width:50%;">Item</th>
                <th style="width:15%;">Price</th>
                <th style="width:20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${currentTable.items
                  .map(
                      (item) => `
                <tr>
                  <td>${item.quantity}</td>
                  <td>${item.item}</td>
                  <td>$${parseFloat(item.price || "0").toFixed(2)}</td>
                  <td>$${(
                      parseFloat(item.quantity || "0") *
                      parseFloat(item.price || "0")
                  ).toFixed(2)}</td>
                </tr>
              `
                  )
                  .join("")}
            </tbody>
          </table>

          <div style="margin-top: 30px; text-align: right;">
            <p><strong>Subtotal:</strong> $${totalSpent.toFixed(2)}</p>
            <p><strong>Tip (${
                currentTable.tipPercentage
            }%):</strong> $${tipAmount.toFixed(2)}</p>
            <p><strong>Tax (${(taxRate * 100).toFixed(
                2
            )}%):</strong> $${taxAmount.toFixed(2)}</p>
            <p class="summary-total"><strong>Total:</strong> $${totalWithTipAndTax.toFixed(
                2
            )}</p>
          </div>
          <p style="text-align: center; margin-top: 40px;">Thank you for your visit!</p>
        </div>
      </body>
      </html>
    `;

        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(billContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            showMessage(
                "Could not open print window. Please allow pop-ups.",
                false
            );
        }
    };

    // --- Menu Editor Functions ---
    const handleAddMenuItem = (itemName, itemPrice) => {
        if (!itemName.trim() || isNaN(parseFloat(itemPrice))) {
            alert("Please enter a valid item name and price.");
            return;
        }
        const newId =
            menuItems.length > 0
                ? Math.max(...menuItems.map((item) => item.id)) + 1
                : 1;
        setMenuItems((prev) => [
            ...prev,
            { id: newId, name: itemName.trim(), price: parseFloat(itemPrice) },
        ]);
    };

    const handleUpdateMenuItem = (id, newName, newPrice) => {
        setMenuItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          name: newName.trim(),
                          price: parseFloat(newPrice),
                      }
                    : item
            )
        );
    };

    const handleDeleteMenuItem = (id) => {
        // Show custom confirmation modal for menu item deletion
        setConfirmModalMessage(
            "Are you sure you want to delete this menu item?"
        );
        setConfirmModalAction(() => () => {
            setMenuItems((prev) => prev.filter((item) => item.id !== id));
            setShowConfirmModal(false);
        });
        setShowConfirmModal(true);
    };

    // Handle tax rate change from MenuEditor
    const handleTaxRateChange = (newRate) => {
        setTaxRate(parseFloat(newRate));
    };

    if (appLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-950 text-blue-400 text-3xl font-bold">
                Loading Application...
            </div>
        );
    }

    // If no current table is found after loading, show a message
    if (!currentTable && tables.length > 0) {
        return (
            <div className="text-center p-4 text-gray-200">
                No table selected or selected table not found. Please select a
                table from the list or add a new one.
            </div>
        );
    }
    // If no tables at all, this implies handleAddNewTable should have been called, but this is a fallback.
    if (tables.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-4">
                <p className="text-xl text-gray-200 mb-6">
                    No tables found. Let's create your first table!
                </p>
                <button
                    onClick={handleAddNewTable}
                    className="px-6 py-3 rounded-xl bg-green-700 text-white text-xl font-bold shadow-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-105 group relative overflow-hidden ring-2 ring-green-500 hover:ring-green-400"
                >
                    <span className="relative z-10">+ Create First Table</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-950 p-4 font-sans antialiased">
            <div className="flex-1 max-w-3xl mx-auto w-full bg-gray-900 rounded-2xl shadow-xl p-8 my-6 border border-gray-800">
                {/* Header and Controls */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-700">
                    <h1 className="text-5xl font-extrabold text-blue-400 drop-shadow-lg">
                        OrderFlow
                    </h1>
                    <button
                        onClick={() => setShowMenuEditor(true)}
                        className="px-6 py-3 rounded-xl bg-purple-700 text-white text-lg font-semibold shadow-lg hover:bg-purple-600 transition-all duration-300 transform hover:scale-105 group relative overflow-hidden ring-2 ring-purple-500 hover:ring-purple-400"
                    >
                        <span className="relative z-10">Edit Menu</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                    </button>
                </div>
                {/* Removed userId display as Firebase is removed */}

                {/* Table Selection Header */}
                <div className="mb-8 p-6 bg-gray-800 rounded-xl shadow-inner border border-gray-700">
                    <label className="block text-2xl font-bold mb-4 text-gray-100">
                        Select Table:
                    </label>
                    <div className="flex flex-wrap gap-3 mb-6">
                        {tables
                            .slice() // Create a shallow copy to avoid mutating the original state during sort
                            .sort(
                                (a, b) =>
                                    parseInt(a.tableNumber) -
                                    parseInt(b.tableNumber)
                            ) // Sort numerically by tableNumber
                            .map((table) => (
                                <button
                                    key={table.id}
                                    onClick={() => handleChangeTable(table.id)}
                                    className={`px-5 py-2.5 rounded-lg text-lg font-semibold transition-all duration-200 shadow-md transform hover:scale-105 relative overflow-hidden group
                    ${
                        selectedTableId === table.id
                            ? "bg-blue-600 text-white ring-2 ring-blue-400 shadow-xl"
                            : "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
                    } ${
                                        table.isPaid
                                            ? "border-2 border-green-400 text-green-200"
                                            : ""
                                    }`}
                                >
                                    <span className="relative z-10">
                                        Table {table.tableNumber}
                                    </span>
                                    {table.isPaid && (
                                        <span className="ml-2 text-green-300 text-xl relative z-10">
                                            ✓
                                        </span>
                                    )}
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                </button>
                            ))}
                        <button
                            onClick={handleAddNewTable}
                            className="px-5 py-2.5 rounded-lg text-lg font-semibold bg-green-700 text-white shadow-md hover:bg-green-600 transition-all duration-200 transform hover:scale-105 group relative overflow-hidden ring-2 ring-green-500 hover:ring-green-400"
                        >
                            <span className="relative z-10">+ New Table</span>
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                        </button>
                        <button
                            onClick={handleDeleteTable}
                            className="px-5 py-2.5 rounded-lg text-lg font-semibold bg-red-700 text-white shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-105 group relative overflow-hidden ring-2 ring-red-500 hover:ring-red-400"
                            disabled={tables.length === 0}
                        >
                            <span className="relative z-10">
                                Delete Current Table
                            </span>
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                        </button>
                    </div>
                </div>

                {/* Selected Table Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-800 rounded-xl shadow-inner border border-gray-700">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                        <label className="text-xl font-bold text-gray-100 w-full sm:w-32 shrink-0 mb-2 sm:mb-0">
                            Table No:
                        </label>
                        <input
                            type="number"
                            className="flex-1 border border-gray-600 rounded-lg p-3 text-lg bg-gray-950 text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full"
                            value={currentTable?.tableNumber || ""}
                            onChange={(e) =>
                                handleTablePropertyChange(
                                    "tableNumber",
                                    e.target.value
                                )
                            }
                            placeholder="Table No"
                            disabled={currentTable?.isPaid || false}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                        <label className="text-xl font-bold text-gray-100 w-full sm:w-32 shrink-0 mb-2 sm:mb-0">
                            Server:
                        </label>
                        <input
                            type="text"
                            className="flex-1 border border-gray-600 rounded-lg p-3 text-lg bg-gray-950 text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full"
                            value={currentTable?.serverName || ""}
                            onChange={(e) =>
                                handleTablePropertyChange(
                                    "serverName",
                                    e.target.value
                                )
                            }
                            placeholder="Server Name"
                            disabled={currentTable?.isPaid || false}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                        <label className="text-xl font-bold text-gray-100 w-full sm:w-32 shrink-0 mb-2 sm:mb-0">
                            Customer:
                        </label>
                        <input
                            type="text"
                            className="flex-1 border border-gray-600 rounded-lg p-3 text-lg bg-gray-950 text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full"
                            value={currentTable?.customerName || ""}
                            onChange={(e) =>
                                handleTablePropertyChange(
                                    "customerName",
                                    e.target.value
                                )
                            }
                            placeholder="Customer Name"
                            disabled={currentTable?.isPaid || false}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                        <label className="text-xl font-bold text-gray-100 w-full sm:w-32 shrink-0 mb-2 sm:mb-0">
                            Date:
                        </label>
                        <input
                            type="date"
                            className="flex-1 border border-gray-600 rounded-lg p-3 text-lg bg-gray-950 text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full"
                            value={currentTable?.date || ""}
                            onChange={(e) =>
                                handleTablePropertyChange(
                                    "date",
                                    e.target.value
                                )
                            }
                            disabled={currentTable?.isPaid || false}
                        />
                    </div>
                </div>

                {/* Order Items Table Header */}
                <div className="grid grid-cols-[15%_40%_20%_25%] bg-gray-800 py-4 rounded-t-lg font-semibold text-gray-100 border border-gray-700">
                    <span className="text-center text-lg">Qnty</span>
                    <span className="text-center text-lg">Item</span>
                    <span className="text-right pr-4 text-lg">Price</span>
                    <span className="text-center text-lg">Actions</span>
                </div>

                {/* Order Items List */}
                <div className="border border-gray-700 rounded-b-lg mb-6 overflow-hidden">
                    {currentTable?.items.length === 0 && (
                        <p className="text-center text-gray-400 py-6 bg-gray-900 text-lg">
                            No items added to this order.
                        </p>
                    )}
                    {currentTable?.items.map((item, index) => (
                        <div
                            key={item.id}
                            className={`grid grid-cols-[15%_40%_20%_25%] py-3 items-center ${
                                index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
                            } border-b border-gray-700 last:border-b-0`}
                        >
                            <input
                                type="number"
                                className="text-center text-base p-1 bg-transparent text-white focus:outline-none focus:ring-0 w-full"
                                value={item.quantity}
                                onChange={(e) =>
                                    handleItemChange(
                                        item.id,
                                        "quantity",
                                        e.target.value
                                    )
                                }
                                disabled={currentTable?.isPaid || false}
                            />
                            <input
                                type="text"
                                list="menu-items-datalist"
                                className="text-center text-base p-1 bg-transparent text-white focus:outline-none focus:ring-0 w-full"
                                value={item.item}
                                onChange={(e) =>
                                    handleItemChange(
                                        item.id,
                                        "item",
                                        e.target.value
                                    )
                                }
                                placeholder="Select or type item"
                                disabled={currentTable?.isPaid || false}
                            />
                            <datalist id="menu-items-datalist">
                                {menuItems.map((menuItem) => (
                                    <option
                                        key={menuItem.id}
                                        value={menuItem.name}
                                    />
                                ))}
                            </datalist>

                            <input
                                type="number"
                                step="0.01"
                                className={`text-right text-base p-1 pr-4 focus:outline-none focus:ring-0 w-full ${
                                    menuItems.some((m) => m.name === item.item)
                                        ? "bg-gray-900 text-gray-400"
                                        : "bg-transparent text-white"
                                }`}
                                value={item.price}
                                onChange={(e) =>
                                    handleItemChange(
                                        item.id,
                                        "price",
                                        e.target.value
                                    )
                                }
                                readOnly={
                                    menuItems.some(
                                        (m) => m.name === item.item
                                    ) ||
                                    currentTable?.isPaid ||
                                    false
                                }
                                disabled={currentTable?.isPaid || false}
                            />
                            <div className="flex justify-center">
                                <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md transition-all duration-200 transform hover:scale-110"
                                    title="Delete Item"
                                    disabled={currentTable?.isPaid || false}
                                >
                                    X
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Item Button */}
                <button
                    onClick={handleAddItem}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-3xl font-bold py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 group relative overflow-hidden ring-2 ring-blue-500 hover:ring-blue-400"
                    disabled={currentTable?.isPaid || false}
                >
                    <span className="relative z-10">+ Add Item</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                </button>

                {/* Summary Section */}
                <div className="mt-10 p-6 bg-gray-800 rounded-xl shadow-inner border border-gray-700">
                    <h3 className="text-2xl font-bold text-gray-100 mb-4 text-center pb-3 border-b border-gray-700">
                        Bill Summary
                    </h3>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                        <span className="text-lg font-medium text-gray-200">
                            Subtotal:
                        </span>
                        <span className="text-lg font-semibold text-white">
                            ${totalSpent.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                        <span className="text-lg font-medium text-gray-200">
                            Tip (%):
                        </span>
                        <input
                            type="number"
                            step="1"
                            className="border border-gray-600 rounded-lg p-2 text-lg w-24 text-right bg-gray-950 text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            value={currentTable?.tipPercentage || "0"}
                            onChange={(e) =>
                                handleTablePropertyChange(
                                    "tipPercentage",
                                    e.target.value
                                )
                            }
                            disabled={currentTable?.isPaid || false}
                        />
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                        <span className="text-lg font-medium text-gray-200">
                            Calculated Tip:
                        </span>
                        <span className="text-lg font-semibold text-white">
                            ${tipAmount.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                        <span className="text-lg font-medium text-gray-200">
                            Tax ({taxRate * 100}%):
                        </span>
                        <span className="text-lg font-semibold text-white">
                            ${taxAmount.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-4 font-bold text-2xl text-blue-400">
                        <span>Total:</span>
                        <span>${totalWithTipAndTax.toFixed(2)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col gap-4">
                    <button
                        onClick={handleMarkAsPaid}
                        className={`w-full text-xl font-bold py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 group relative overflow-hidden ring-2
              ${
                  currentTable?.isPaid
                      ? "bg-orange-600 hover:bg-orange-500 text-white ring-orange-500 hover:ring-orange-400"
                      : "bg-green-600 hover:bg-green-500 text-white ring-green-500 hover:ring-green-400"
              }`}
                    >
                        <span className="relative z-10">
                            {currentTable?.isPaid
                                ? "Mark as UNPAID"
                                : "Mark as PAID"}
                        </span>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                    </button>

                    <button
                        onClick={handlePrintBill}
                        className="w-full bg-blue-700 hover:bg-blue-600 text-white text-xl font-bold py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 group relative overflow-hidden ring-2 ring-blue-500 hover:ring-blue-400"
                    >
                        <span className="relative z-10">Print Bill</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                    </button>

                    <button
                        onClick={handleSyncData}
                        className="w-full bg-indigo-700 hover:bg-indigo-600 text-white text-xl font-bold py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 group relative overflow-hidden ring-2 ring-indigo-500 hover:ring-indigo-400"
                    >
                        <span className="relative z-10">Sync Data</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                    </button>
                </div>

                {syncMessage && (
                    <div
                        className={`text-center mt-6 p-4 rounded-lg font-bold text-lg shadow-md ${
                            isSyncSuccess
                                ? "bg-green-700 text-green-100"
                                : "bg-red-700 text-red-100"
                        }`}
                    >
                        {syncMessage}
                    </div>
                )}
            </div>

            {/* Menu Editor Modal */}
            {showMenuEditor && (
                <MenuEditor
                    menuItems={menuItems}
                    taxRate={taxRate}
                    setTaxRate={handleTaxRateChange} // Pass the local state update function
                    onClose={() => setShowMenuEditor(false)}
                    setShowConfirmModal={setShowConfirmModal}
                    setConfirmModalMessage={setConfirmModalMessage}
                    setConfirmModalAction={setConfirmModalAction}
                    handleAddMenuItem={handleAddMenuItem} // Pass local state update functions
                    handleUpdateMenuItem={handleUpdateMenuItem}
                    handleDeleteMenuItem={handleDeleteMenuItem}
                />
            )}

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <ConfirmModal
                    message={confirmModalMessage}
                    onConfirm={() => {
                        if (confirmModalAction) confirmModalAction();
                    }}
                    onCancel={() => setShowConfirmModal(false)}
                />
            )}
        </div>
    );
};

// --- Menu Editor Component ---
const MenuEditor = ({
    menuItems,
    taxRate,
    setTaxRate,
    onClose,
    setShowConfirmModal,
    setConfirmModalMessage,
    setConfirmModalAction,
    handleAddMenuItem,
    handleUpdateMenuItem,
    handleDeleteMenuItem,
}) => {
    const [newItemName, setNewItemName] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [editingItemId, setEditingItemId] = useState(null); // ID of the item being edited
    const [taxRateInput, setTaxRateInput] = useState(() =>
        (taxRate * 100).toFixed(2)
    ); // Local state for tax rate input

    useEffect(() => {
        // Update local input state when the prop 'taxRate' changes from parent
        setTaxRateInput((taxRate * 100).toFixed(2));
    }, [taxRate]); // Depend on taxRate prop

    // Function to add a new menu item
    const handleAdd = () => {
        if (!newItemName.trim() || isNaN(parseFloat(newItemPrice))) {
            alert("Please enter a valid item name and price.");
            return;
        }
        handleAddMenuItem(newItemName, newItemPrice); // Call parent's local state update function
        setNewItemName("");
        setNewItemPrice("");
    };

    // Function to start editing an existing item
    const handleEdit = (item) => {
        setEditingItemId(item.id);
        setNewItemName(item.name);
        setNewItemPrice(item.price.toFixed(2));
    };

    // Function to save changes to an existing item
    const handleSaveEdit = (id) => {
        if (!newItemName.trim() || isNaN(parseFloat(newItemPrice))) {
            alert("Please enter valid item name and price for update.");
            return;
        }
        handleUpdateMenuItem(id, newItemName, newItemPrice); // Call parent's local state update function
        setEditingItemId(null);
        setNewItemName("");
        setNewItemPrice("");
    };

    // Function to cancel editing an item
    const handleCancelEdit = () => {
        setEditingItemId(null);
        setNewItemName("");
        setNewItemPrice("");
    };

    // Function to delete a menu item (uses custom confirmation modal)
    const handleDelete = (id) => {
        handleDeleteMenuItem(id); // Call parent's local state update function, which uses confirm modal
    };

    // Handle change for tax rate input (calls parent's function which updates local state)
    const handleTaxRateInputChange = (e) => {
        setTaxRateInput(e.target.value); // Update local state as user types
    };

    const handleTaxRateInputBlur = () => {
        const rate = parseFloat(taxRateInput);
        if (!isNaN(rate)) {
            setTaxRate(rate / 100); // Pass the decimal value to parent's setTaxRate prop
        } else {
            alert("Please enter a valid number for tax rate."); // Consider using custom modal
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700">
                <h2 className="text-3xl font-bold mb-8 text-center text-blue-400">
                    Edit Menu & Settings
                </h2>

                {/* Tax Rate Section */}
                <div className="mb-8 p-5 border border-gray-700 rounded-xl bg-gray-700 shadow-inner">
                    <h3 className="text-xl font-semibold mb-3 text-gray-100">
                        Tax Rate (%)
                    </h3>
                    <div className="flex gap-4">
                        {" "}
                        {/* Added a flex container for input and save button */}
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Tax Rate Percentage (e.g., 8 for 8%)"
                            value={taxRateInput}
                            onChange={handleTaxRateInputChange}
                            onBlur={handleTaxRateInputBlur} // Apply changes when input loses focus
                            className="flex-1 p-3 border border-gray-600 rounded-lg text-lg bg-gray-950 text-white focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        />
                        {/* The save button is redundant if using onBlur, but kept for explicit action if preferred */}
                        <button
                            onClick={handleTaxRateInputBlur}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-500 transition-colors duration-200 min-w-max"
                        >
                            Save
                        </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                        Enter the tax rate as a percentage (e.g., 8 for 8%, 13
                        for 13%).
                    </p>
                </div>

                {/* Add New Item Section */}
                <div className="mb-8 p-5 border border-gray-700 rounded-xl bg-gray-700 shadow-inner">
                    <h3 className="text-xl font-semibold mb-4 text-gray-100">
                        {editingItemId ? "Edit Item" : "Add New Item"}
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        <input
                            type="text"
                            placeholder="Item Name"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="flex-1 p-3 border border-gray-600 rounded-lg text-lg bg-gray-950 text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 min-w-0"
                        />
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                            className="w-full md:w-32 p-3 border border-gray-600 rounded-lg text-lg bg-gray-950 text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 shrink-0"
                        />
                        {editingItemId ? (
                            <>
                                <button
                                    onClick={() =>
                                        handleSaveEdit(editingItemId)
                                    }
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 group relative overflow-hidden ring-2 ring-blue-500 hover:ring-blue-400 w-full md:w-auto"
                                >
                                    <span className="relative z-10">Save</span>
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 group relative overflow-hidden ring-2 ring-gray-500 hover:ring-gray-400 w-full md:w-auto"
                                >
                                    <span className="relative z-10">
                                        Cancel
                                    </span>
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleAdd}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 group relative overflow-hidden ring-2 ring-green-500 hover:ring-green-400 w-full md:w-auto"
                            >
                                <span className="relative z-10">Add Item</span>
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Current Menu Items List */}
                <div className="border border-gray-700 rounded-xl overflow-hidden shadow-lg">
                    <div className="grid grid-cols-[45%_25%_30%] bg-gray-600 py-4 font-bold text-gray-100 border-b border-gray-700">
                        <span className="px-5 text-lg">Item Name</span>
                        <span className="px-5 text-right text-lg">Price</span>
                        <span className="px-5 text-center text-lg">
                            Actions
                        </span>
                    </div>
                    {menuItems.length === 0 ? (
                        <p className="text-center text-gray-400 py-6 bg-gray-900 text-lg">
                            No menu items added yet.
                        </p>
                    ) : (
                        menuItems.map((item, index) => (
                            <div
                                key={item.id}
                                className={`grid grid-cols-[45%_25%_30%] py-4 items-center ${
                                    index % 2 === 0
                                        ? "bg-gray-900"
                                        : "bg-gray-800"
                                } border-b border-gray-700 last:border-b-0`}
                            >
                                <span className="px-5 text-gray-200 text-base min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                    {item.name}
                                </span>
                                <span className="px-5 text-right text-gray-200 text-base min-w-0">
                                    ${item.price.toFixed(2)}
                                </span>
                                <div className="flex justify-center gap-3 px-5 flex-wrap min-w-0">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-4 py-1.5 rounded-full shadow-md transition-all duration-200 transform hover:scale-110 min-w-max"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-1.5 rounded-full shadow-md transition-all duration-200 transform hover:scale-110 min-w-max"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full bg-gray-600 hover:bg-gray-500 text-white text-xl font-bold py-3 rounded-xl mt-8 shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 group relative overflow-hidden ring-2 ring-gray-500 hover:ring-gray-400"
                >
                    <span className="relative z-10">Close Menu Editor</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                </button>
            </div>
        </div>
    );
};

// --- Custom Confirmation Modal Component ---
const ConfirmModal = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center border border-gray-700">
                <p className="text-xl font-semibold mb-8 text-gray-100">
                    {message}
                </p>
                <div className="flex justify-center gap-6">
                    <button
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-200 transform hover:scale-105 group relative overflow-hidden ring-2 ring-red-500 hover:ring-red-400"
                    >
                        <span className="relative z-10">Confirm</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-200 transform hover:scale-105 group relative overflow-hidden ring-2 ring-gray-500 hover:ring-gray-400"
                    >
                        <span className="relative z-10">Cancel</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
